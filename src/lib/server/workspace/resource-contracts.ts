/**
 * Representative file and background-job boundary contracts for spec §13.1.
 *
 * There is no Phase 1 asset store or job runner. Callers must provide explicit
 * action and current-authority policies; workspace:read never implies a file,
 * export, execution, or publication permission. These contracts are useful
 * only when a real adapter supplies those policies and is separately tested.
 */

import { ACTION_ROLES, assertOperationAction, assertOperationContext } from "./context.js";
import type { OperationContext } from "./context.js";
import { WorkspaceAccessError } from "./errors.js";

export interface WorkspaceResource {
  id: string;
  workspaceId: string;
}

export type ExplicitActionPolicy = (
  ctx: OperationContext,
  action: string,
) => boolean | Promise<boolean>;

function deny(): never {
  throw new WorkspaceAccessError();
}

function assertSupportedAction(ctx: OperationContext, action: string): void {
  if (Object.prototype.hasOwnProperty.call(ACTION_ROLES, action)) {
    assertOperationAction(ctx, action as keyof typeof ACTION_ROLES);
  }
}

async function requireExplicitAction(
  ctx: OperationContext,
  action: string,
  policy: ExplicitActionPolicy,
): Promise<void> {
  assertOperationContext(ctx);
  if (!action.trim()) deny();
  assertSupportedAction(ctx, action);
  try {
    if ((await policy(ctx, action)) !== true) deny();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) throw error;
    deny();
  }
}

/**
 * Resolves a resource under the context's workspace and verifies ownership
 * again before returning it. The resolver must query by both IDs; the returned
 * tenant key is checked here to catch a broken adapter or cross-workspace row.
 */
export async function requireWorkspaceResource<Resource extends WorkspaceResource>(
  ctx: OperationContext,
  resourceId: string,
  action: string,
  policy: ExplicitActionPolicy,
  resolveByWorkspace: (workspaceId: string, resourceId: string) => Promise<Resource | null>,
): Promise<Resource> {
  await requireExplicitAction(ctx, action, policy);
  const resource = await resolveByWorkspace(ctx.workspaceId, resourceId);
  if (!resource || resource.workspaceId !== ctx.workspaceId) deny();
  return resource;
}

/** A signed URL is created only after action and resource-ownership checks. */
export async function issueWorkspaceFileUrl<Resource extends WorkspaceResource>(
  ctx: OperationContext,
  resourceId: string,
  action: string,
  policy: ExplicitActionPolicy,
  resolveByWorkspace: (workspaceId: string, resourceId: string) => Promise<Resource | null>,
  sign: (resource: Resource) => Promise<string>,
): Promise<string> {
  const resource = await requireWorkspaceResource(
    ctx,
    resourceId,
    action,
    policy,
    resolveByWorkspace,
  );
  return sign(resource);
}

export interface CapturedPrincipal {
  readonly userId: string;
  readonly organisationId: string;
  readonly workspaceId: string;
}

export interface CapturedWorkspaceJob<Input = unknown> {
  readonly principal: CapturedPrincipal;
  readonly action: string;
  readonly input: Input;
}

export type JobPhase = "enqueue" | "execute" | "publish";

/** Every job caller must supply live context, action, and entitlement policy. */
export interface WorkspaceJobPolicy {
  resolveCurrentContext(
    principal: CapturedPrincipal,
    phase: JobPhase,
  ): Promise<OperationContext | null>;
  authorizeAction(
    ctx: OperationContext,
    action: string,
    phase: JobPhase,
  ): boolean | Promise<boolean>;
  isEntitled(ctx: OperationContext, phase: JobPhase): boolean | Promise<boolean>;
}

export interface WorkspaceJobExecution<Input, Output> {
  readonly job: CapturedWorkspaceJob<Input>;
  readonly output: Output;
}

function samePrincipal(ctx: OperationContext, principal: CapturedPrincipal): boolean {
  return (
    ctx.userId === principal.userId &&
    ctx.organisationId === principal.organisationId &&
    ctx.workspaceId === principal.workspaceId
  );
}

async function reauthorizeJob(
  job: CapturedWorkspaceJob,
  policy: WorkspaceJobPolicy,
  phase: JobPhase,
): Promise<OperationContext> {
  let ctx: OperationContext | null;
  try {
    ctx = await policy.resolveCurrentContext(job.principal, phase);
  } catch {
    return deny();
  }
  if (!ctx) deny();
  assertOperationContext(ctx);
  if (!samePrincipal(ctx, job.principal)) deny();
  assertSupportedAction(ctx, job.action);
  try {
    if ((await policy.authorizeAction(ctx, job.action, phase)) !== true) deny();
    if ((await policy.isEntitled(ctx, phase)) !== true) deny();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) throw error;
    deny();
  }
  return ctx;
}

/** Captures identity and workspace from validated context, never UI preference. */
export async function captureWorkspaceJob<Input>(
  ctx: OperationContext,
  action: string,
  input: Input,
  policy: WorkspaceJobPolicy,
): Promise<CapturedWorkspaceJob<Input>> {
  assertOperationContext(ctx);
  assertSupportedAction(ctx, action);
  try {
    if ((await policy.authorizeAction(ctx, action, "enqueue")) !== true) deny();
    if ((await policy.isEntitled(ctx, "enqueue")) !== true) deny();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) throw error;
    deny();
  }
  const principal = Object.freeze({
    userId: ctx.userId,
    organisationId: ctx.organisationId,
    workspaceId: ctx.workspaceId,
  });
  return Object.freeze({ principal, action, input });
}

/** Reauthorizes immediately before work begins. */
export async function executeWorkspaceJob<Input, Output>(
  job: CapturedWorkspaceJob<Input>,
  policy: WorkspaceJobPolicy,
  execute: (ctx: OperationContext, input: Input) => Promise<Output>,
): Promise<WorkspaceJobExecution<Input, Output>> {
  const ctx = await reauthorizeJob(job, policy, "execute");
  const output = await execute(ctx, job.input);
  return Object.freeze({ job, output });
}

/** Reauthorizes again before publishing a previously computed result. */
export async function publishWorkspaceJobResult<Input, Output>(
  execution: WorkspaceJobExecution<Input, Output>,
  policy: WorkspaceJobPolicy,
  publish: (ctx: OperationContext, output: Output) => Promise<void>,
): Promise<void> {
  const ctx = await reauthorizeJob(execution.job, policy, "publish");
  await publish(ctx, execution.output);
}
