import { describe, expect, it, vi } from "vitest";
import { StrategyOutbox, type OutboxDelivery } from "../outbox";

describe("Strategy outbox job dispatch", () => {
  it("binds immediate delivery to the same event key used by later replay", async () => {
    let runId:string|null=null;
    const pool={query:vi.fn(async(sql:string)=>{
      if(sql.startsWith('SELECT * FROM strategy_outbox'))return {rows:[{id:'61',organisation_id:'org',brand_id:'brand',engagement_id:'eng',session_id:'session',revision:1,kind:'strategy.job.enqueue',payload:{jobId:'job'},delivery_fence:0,epoch:0}]};
      if(sql.startsWith('SELECT provider_run_id'))return {rows:[{provider_run_id:runId}]};
      runId='run-provider';return {rowCount:1,rows:[]};
    })} as never;
    const gateway={dispatch:vi.fn(async()=>({runId:'run-provider'}))};
    const outbox=new StrategyOutbox(pool);
    await outbox.dispatchCommittedJob('job',gateway);
    await outbox.dispatchCommittedJob('job',gateway);
    expect(gateway.dispatch).toHaveBeenCalledTimes(1);
    expect(gateway.dispatch).toHaveBeenCalledWith({jobId:'job',idempotencyKey:'strategy-outbox:61'});
  });
  it("reuses the persisted run after dispatch succeeded but acknowledgement was lost", async () => {
    let providerRunId: string | null = null;
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.startsWith("SELECT provider_run_id")) {
          return { rows: [{ provider_run_id: providerRunId }] };
        }
        providerRunId = "run-1";
        return { rowCount: 1, rows: [] };
      }),
    } as never;
    const gateway = { dispatch: vi.fn(async () => ({ runId: "run-1" })) };
    const outbox = new StrategyOutbox(pool);
    const event: OutboxDelivery = {
      id: "71",
      organisationId: "org",
      brandId: "brand",
      engagementId: "engagement",
      sessionId: "session",
      revision: 1,
      kind: "strategy.job.enqueue",
      payload: { jobId: "job-1" },
      fence: 1,
      epoch: 0,
    };

    await outbox.dispatchJob(event, gateway);
    await outbox.dispatchJob({ ...event, fence: 2 }, gateway);

    expect(gateway.dispatch).toHaveBeenCalledTimes(1);
    expect(gateway.dispatch).toHaveBeenCalledWith({
      jobId: "job-1",
      idempotencyKey: "strategy-outbox:71",
    });
  });

  it("does not acknowledge an outbox item whose SQL job binding is missing", async () => {
    const pool = {
      query: vi.fn(async () => ({ rows: [] })),
    } as never;
    const gateway = { dispatch: vi.fn(async () => ({ runId: "run-1" })) };
    const outbox = new StrategyOutbox(pool);
    const event = {
      id: "72",
      organisationId: "org",
      brandId: "brand",
      engagementId: "engagement",
      sessionId: "session",
      revision: 1,
      kind: "strategy.job.enqueue",
      payload: { jobId: "missing-job" },
      fence: 1,
      epoch: 0,
    } satisfies OutboxDelivery;

    await expect(outbox.dispatchJob(event, gateway)).rejects.toThrow("Outbox job binding unavailable");
    expect(gateway.dispatch).not.toHaveBeenCalled();
  });
});
