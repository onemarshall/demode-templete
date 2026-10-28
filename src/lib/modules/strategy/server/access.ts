/** Host adapters must resolve current organisation membership AND active brand assignment.
 * When a transaction is supplied they must lock their authority rows until commit.
 * Strategy does not infer approval authority from a role or a legacy actor declaration.
 */
export type StrategyAction = "read" | "edit" | "approve" | "generate" | "export" | "manage";
export interface AuthorityQuery {
  query(text: string, values?: unknown[]): Promise<unknown>;
}
export interface AccessRequest {
  organisationId: string;
  brandId: string;
  engagementId: string;
  action: StrategyAction;
}
export interface StrategyAuthority {
  actorId: string;
  organisationId: string;
  brandId: string;
  activeMembership: boolean;
  activeBrandAssignment: boolean;
  actions: readonly StrategyAction[];
  /** Explicit grant for this engagement, checked live by the host. */
  approvalEngagementId?: string;
}
export type AuthorityResolver = (
  request: Readonly<AccessRequest>,
  transaction?: AuthorityQuery,
) => Promise<StrategyAuthority | null>;
const issued = new WeakSet<object>();
const resolvers = new WeakMap<object, AuthorityResolver>();
const publications = new WeakMap<object, Set<string>>();
const attempts = new WeakMap<object, { jobId: string; fence: number }>();
declare const scopeBrand: unique symbol;
export interface StrategyScope extends Readonly<AccessRequest> {
  readonly actorId: string;
  readonly [scopeBrand]: true;
}
export class StrategyAccessError extends Error {
  constructor() {
    super("Strategy access denied");
    this.name = "StrategyAccessError";
  }
}
function verify(request: AccessRequest, authority: StrategyAuthority | null): StrategyAuthority {
  if (
    typeof authority?.actorId !== "string" ||
    !authority.actorId.trim() ||
    authority.activeMembership !== true ||
    authority.activeBrandAssignment !== true ||
    authority.organisationId !== request.organisationId ||
    authority.brandId !== request.brandId ||
    !authority.actions.includes(request.action) ||
    (request.action === "approve" && authority.approvalEngagementId !== request.engagementId)
  )
    throw new StrategyAccessError();
  return authority;
}
export function createStrategyAccess(resolve: AuthorityResolver) {
  return {
    async authorize(request: AccessRequest): Promise<StrategyScope> {
      const input = Object.freeze({ ...request });
      const authority = verify(input, await resolve(input));
      const scope = Object.freeze({ ...input, actorId: authority.actorId }) as StrategyScope;
      issued.add(scope);
      resolvers.set(scope, resolve);
      return scope;
    },
  };
}
export function assertStrategyScope(
  scope: StrategyScope,
  actions?: readonly StrategyAction[],
): void {
  if (!scope || !issued.has(scope) || (actions && !actions.includes(scope.action)))
    throw new StrategyAccessError();
}
export async function recheckStrategyScope(
  scope: StrategyScope,
  transaction?: AuthorityQuery,
): Promise<void> {
  assertStrategyScope(scope);
  const authority = verify(scope, await resolvers.get(scope)!(scope, transaction));
  if (authority.actorId !== scope.actorId) throw new StrategyAccessError();
}

/** Worker-only proof that this attempt passed publication policy after its
 * provider finished. It cannot be serialized in a task payload. */
export function grantStrategyPublication(
  scope: StrategyScope,
  lease: { jobId: string; fence: number },
) {
  assertStrategyScope(scope, ["generate"]);
  const grants = publications.get(scope) ?? new Set<string>();
  grants.add(JSON.stringify([lease.jobId, lease.fence]));
  publications.set(scope, grants);
}
export function revokeStrategyPublication(
  scope: StrategyScope,
  lease: { jobId: string; fence: number },
) {
  publications.get(scope)?.delete(JSON.stringify([lease.jobId, lease.fence]));
  const bound = attempts.get(scope);
  if (bound?.jobId === lease.jobId && bound.fence === lease.fence) attempts.delete(scope);
}
export function assertStrategyPublication(
  scope: StrategyScope,
  lease: { jobId: string; fence: number },
) {
  assertStrategyScope(scope, ["generate"]);
  if (!publications.get(scope)?.has(JSON.stringify([lease.jobId, lease.fence])))
    throw new Error("Job publication policy was not checked for this attempt");
}
export function bindStrategyJobAttempt(
  scope: StrategyScope,
  lease: { jobId: string; fence: number },
) {
  assertStrategyScope(scope, ["generate"]);
  if (attempts.has(scope)) throw new Error("Worker authority scope is already bound to an attempt");
  attempts.set(scope, { ...lease });
}
/** A worker scope cannot fall back to the ordinary synchronous web mutation path. */
export function assertStrategyWorkerMutation(
  scope: StrategyScope,
  lease?: { jobId: string; fence: number },
) {
  const bound = attempts.get(scope);
  if (bound && (!lease || lease.jobId !== bound.jobId || lease.fence !== bound.fence))
    throw new Error("Worker mutation requires its current job lease");
}
