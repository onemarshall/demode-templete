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
export function createTriggerStrategyGateway(taskId:string,configuration?:TriggerDeliveryConfiguration): StrategyJobGateway {
  if(!["auth-strategy-m04-session-v2","auth-strategy-m01-session-v1","auth-strategy-m02-session-v1","auth-strategy-m03-session-v1","auth-strategy-bf-session-v1","auth-strategy-m05-session-v1","auth-strategy-m06-session-v1","auth-strategy-m07-session-v1","auth-strategy-m08-session-v1","auth-strategy-m09-session-v1","auth-strategy-m10-session-v1","auth-strategy-cd-session-v1","auth-strategy-m11-session-v1"].includes(taskId))throw new Error("Unsupported Strategy task");
  return {
    async dispatch({ jobId, idempotencyKey }) {
      const { tasks, idempotencyKeys } = await import("@trigger.dev/sdk");
      const key = await idempotencyKeys.create(idempotencyKey, { scope: "global" });
      const handle = await tasks.trigger(
        taskId,
        { version: 1, jobId },
        { idempotencyKey: key },
        configuration?{clientConfig:{accessToken:configuration.accessToken,baseURL:configuration.baseURL,previewBranch:configuration.branch}}:undefined,
      );
      return { runId: handle.id };
    },
  };
}

export const createTriggerM04Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m04-session-v2",configuration);
export const createTriggerM01Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m01-session-v1",configuration);

export const createTriggerM02Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m02-session-v1",configuration);

export const createTriggerM03Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m03-session-v1",configuration);

export const createTriggerBFGateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-bf-session-v1",configuration);

export const createTriggerM05Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m05-session-v1",configuration);

export const createTriggerM06Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m06-session-v1",configuration);

export const createTriggerM07Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m07-session-v1",configuration);

export const createTriggerM08Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m08-session-v1",configuration);

export const createTriggerM09Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m09-session-v1",configuration);

export const createTriggerM10Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m10-session-v1",configuration);

export const createTriggerCDGateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-cd-session-v1",configuration);

export const createTriggerM11Gateway=(configuration?:TriggerDeliveryConfiguration)=>createTriggerStrategyGateway("auth-strategy-m11-session-v1",configuration);
