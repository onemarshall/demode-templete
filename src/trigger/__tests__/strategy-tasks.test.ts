import { describe, expect, it, vi } from "vitest";
import {
  authStrategyM04SessionV2PayloadSchema,
  runAuthStrategyM04SessionV2,
  runAuthStrategyRecoveryV1,
} from "../strategy-task-handlers";

describe("Auth Strategy Trigger contracts", () => {
  it("accepts the versioned payload emitted by the gateway and rejects legacy ids", () => {
    expect(authStrategyM04SessionV2PayloadSchema.parse({ version: 1, jobId: "job-1" })).toEqual({
      version: 1,
      jobId: "job-1",
    });
    expect(() => authStrategyM04SessionV2PayloadSchema.parse({ jobId: "job-1" })).toThrow();
    expect(() => authStrategyM04SessionV2PayloadSchema.parse({ version: 1, jobId: "" })).toThrow();
  });

  it("runs the reusable worker handler without Trigger metadata", async () => {
    const run = vi.fn(async () => "succeeded" as const);
    const result = await runAuthStrategyM04SessionV2(
      { version: 1, jobId: "job-1" },
      { worker: { run } } as never,
    );
    expect(result).toEqual({ jobId: "job-1", status: "succeeded" });
    expect(run).toHaveBeenCalledWith("job-1");
  });

  it("continues draining outbox events after failures and reports them", async () => {
    const dispatchOne = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValueOnce(new Error("unsupported event"))
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const dispatchRecoverable = vi.fn(async () => 2);
    const result = runAuthStrategyRecoveryV1(
      { recovery: { dispatchRecoverable }, outboxDispatcher: { dispatchOne } } as never,
    );
    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining("processed 2 job(s) and 1 outbox event(s), with 1 error(s)"),
    });
    expect(dispatchOne).toHaveBeenCalledTimes(3);
  });

  it("drains checkpoint outbox events even when job recovery fails", async () => {
    const dispatchOne = vi.fn(async () => false);
    const dispatchRecoverable = vi.fn(async () => {
      throw new Error("job gateway unavailable");
    });
    await expect(
      runAuthStrategyRecoveryV1(
        { recovery: { dispatchRecoverable }, outboxDispatcher: { dispatchOne } } as never,
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining("processed 0 job(s) and 0 outbox event(s), with 1 error(s)"),
    });
    expect(dispatchOne).toHaveBeenCalledTimes(1);
  });
});
