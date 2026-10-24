/**
 * Representative file and background-job boundary contracts for spec §13.1.
 *
 * There is no Phase 1 asset store or job runner. Callers must provide explicit
 * action and current-authority policies; brand:read never implies a file,
 * export, execution, or publication permission. These contracts are useful
 * only when a real adapter supplies those policies and is separately tested.
 */

import { ACTION_ROLES, assertOperationAction, assertOperationContext } from "./context.js";
import type { OperationContext } from "./context.js";
import { BrandAccessError } from "./errors.js";

export interface BrandResource {
  id: string;
  brandId: string;
}

export type ExplicitActionPolicy = (
  ctx: OperationContext,
  action: string,
) => boolean | Promise<boolean>;

function deny(): never {
  throw new BrandAccessError();
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
    if (error instanceof BrandAccessError) throw error;
    deny();
  }
}

/**
 * Resolves a resource under the context's brand and verifies ownership
 * again before returning it. The resolver must query by both IDs; the returned
 * tenant key is checked here to catch a broken adapter or cross-brand row.
 */
export async function requireBrandResource<Resource extends BrandResource>(
  ctx: OperationContext,
  resourceId: string,
  action: string,
  policy: ExplicitActionPolicy,
  resolveByBrand: (brandId: string, resourceId: string) => Promise<Resource | null>,
): Promise<Resource> {
  await requireExplicitAction(ctx, action, policy);
  const resource = await resolveByBrand(ctx.brandId, resourceId);
  if (!resource || resource.brandId !== ctx.brandId) deny();
  return resource;
}

/** A signed URL is created only after action and resource-ownership checks. */
export async function issueBrandFileUrl<Resource extends BrandResource>(
  ctx: OperationContext,
  resourceId: string,
  action: string,
  policy: ExplicitActionPolicy,
  resolveByBrand: (brandId: string, resourceId: string) => Promise<Resource | null>,
  sign: (resource: Resource) => Promise<string>,
): Promise<string> {
  const resource = await requireBrandResource(
    ctx,
    resourceId,
    action,
    policy,
    resolveByBrand,
  );
  return sign(resource);
}

export interface CapturedPrincipal {
  readonly userId: string;
  readonly organisationId: string;
  readonly brandId: string;
}

export interface CapturedBrandJob<Input = unknown> {
  readonly principal: CapturedPrincipal;
  readonly action: string;
  readonly input: Input;
}

export type JobPhase = "enqueue" | "execute" | "publish";

/** Every job caller must supply live context, action, and entitlement policy. */
export interface BrandJobPolicy {
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

export interface BrandJobExecution<Input, Output> {
  readonly job: CapturedBrandJob<Input>;
  readonly output: Output;
}

function samePrincipal(ctx: OperationContext, principal: CapturedPrincipal): boolean {
  return (
    ctx.userId === principal.userId &&
    ctx.organisationId === principal.organisationId &&
    ctx.brandId === principal.brandId
  );
}

async function reauthorizeJob(
  job: CapturedBrandJob,
  policy: BrandJobPolicy,
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
    if (error instanceof BrandAccessError) throw error;
    deny();
  }
  return ctx;
}

/** Captures identity and brand from validated context, never UI preference. */
export async function captureBrandJob<Input>(
  ctx: OperationContext,
  action: string,
  input: Input,
  policy: BrandJobPolicy,
): Promise<CapturedBrandJob<Input>> {
  assertOperationContext(ctx);
  assertSupportedAction(ctx, action);
  try {
    if ((await policy.authorizeAction(ctx, action, "enqueue")) !== true) deny();
    if ((await policy.isEntitled(ctx, "enqueue")) !== true) deny();
  } catch (error) {
    if (error instanceof BrandAccessError) throw error;
    deny();
  }
  const principal = Object.freeze({
    userId: ctx.userId,
    organisationId: ctx.organisationId,
    brandId: ctx.brandId,
  });
  return Object.freeze({ principal, action, input });
}

/** Reauthorizes immediately before work begins. */
export async function executeBrandJob<Input, Output>(
  job: CapturedBrandJob<Input>,
  policy: BrandJobPolicy,
  execute: (ctx: OperationContext, input: Input) => Promise<Output>,
): Promise<BrandJobExecution<Input, Output>> {
  const ctx = await reauthorizeJob(job, policy, "execute");
  const output = await execute(ctx, job.input);
  return Object.freeze({ job, output });
}

/** Reauthorizes again before publishing a previously computed result. */
export async function publishBrandJobResult<Input, Output>(
  execution: BrandJobExecution<Input, Output>,
  policy: BrandJobPolicy,
  publish: (ctx: OperationContext, output: Output) => Promise<void>,
): Promise<void> {
  const ctx = await reauthorizeJob(execution.job, policy, "publish");
  await publish(ctx, execution.output);
}
