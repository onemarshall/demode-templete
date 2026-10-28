/** Trigger.dev is an injected delivery mechanism. It never supplies business authority. */
export interface StrategyJobGateway {
  dispatch(input: { jobId: string; idempotencyKey: string }): Promise<{ runId: string }>;
}
export interface CheckpointOwnership {
  organisationId: string;
  brandId: string;
  engagementId: string;
}
export interface StrategyCheckpointGateway {
  /** Deduplicate event keys. Sequential delivery rejects older epoch/revision pairs.
   * Independent delivery compares revisions per gate, never across different gates.
   * The database session remains the authority for whether a gate is confirmed. */
  deliver(
    input: CheckpointOwnership & {
      eventKey: string;
      sessionId: string;
      stage: string;
      revision: number;
      epoch: number;
      ordering?: "sequential" | "independent";
    },
  ): Promise<void>;
  reset(
    input: CheckpointOwnership & {
      eventKey: string;
      sessionId: string;
      restartFrom: string;
      revision: number;
      epoch: number;
    },
  ): Promise<void>;
}

/** Explicit Node host adapter; no task instance enters the web application bundle. */
export interface TriggerDeliveryConfiguration {accessToken:string;baseURL?:string;branch?:string}
export function createTriggerM04Gateway(configuration?:TriggerDeliveryConfiguration): StrategyJobGateway {
  return {
    async dispatch({ jobId, idempotencyKey }) {
      const { tasks, idempotencyKeys } = await import("@trigger.dev/sdk");
      const key = await idempotencyKeys.create(idempotencyKey, { scope: "global" });
      const handle = await tasks.trigger(
        "auth-strategy-m04-session-v2",
        { version: 1, jobId },
        { idempotencyKey: key },
        configuration?{clientConfig:{accessToken:configuration.accessToken,baseURL:configuration.baseURL,previewBranch:configuration.branch}}:undefined,
      );
      return { runId: handle.id };
    },
  };
}
