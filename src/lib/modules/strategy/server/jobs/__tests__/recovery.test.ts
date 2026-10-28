import { describe, expect, it, vi } from "vitest";
import { createStrategyRecovery } from "../recovery";

describe("strategy job recovery", () => {
  it("dispatches ID-only candidates with distinct idempotency keys", async () => {
    const dispatch = vi.fn(async (_input: { jobId: string; idempotencyKey: string }) => ({ runId: "run" }));
    const recoverable = vi.fn(async (_limit: number, _stage?: string) => ["job-a", "job-b"]);
    const recovery = createStrategyRecovery({
      jobs: { recoverable },
      gateway: { dispatch },
    });

    expect(await recovery.dispatchRecoverable()).toBe(2);
    expect(dispatch).toHaveBeenCalledTimes(2);
    const first = dispatch.mock.calls[0]![0]!;
    const second = dispatch.mock.calls[1]![0]!;
    expect(first.jobId).toBe("job-a");
    expect(second.jobId).toBe("job-b");
    expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
    expect(first.idempotencyKey).toMatch(/^strategy-recovery:job-a:/);
    expect(recoverable).toHaveBeenCalledWith(50, "m04");
  });

  it("does not dispatch when the durable store has no candidates", async () => {
    const dispatch = vi.fn(async (_input: { jobId: string; idempotencyKey: string }) => ({ runId: "run" }));
    const recovery = createStrategyRecovery({
      jobs: { recoverable: vi.fn(async () => []) },
      gateway: { dispatch },
    });
    expect(await recovery.dispatchRecoverable()).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("attempts every reserved candidate and reports failures afterward", async () => {
    const dispatch = vi
      .fn(async ({ jobId }: { jobId: string }) => {
        if (jobId === "job-b") throw new Error("provider unavailable");
        return { runId: `run-${jobId}` };
      });
    const recovery = createStrategyRecovery({
      jobs: { recoverable: vi.fn(async () => ["job-a", "job-b", "job-c"]) },
      gateway: { dispatch },
    });

    await expect(recovery.dispatchRecoverable()).rejects.toMatchObject({
      message: expect.stringContaining("dispatched 2, failed 1"),
    });
    expect(dispatch).toHaveBeenCalledTimes(3);
  });
});
