import { describe, expect, it, mock } from "bun:test";
import { safeCleanupProlog } from "../../src/utils/prolog-cleanup.js";

type MockProlog = {
  query: (q: string) => Promise<unknown>;
  terminate: () => Promise<void>;
};

describe("safeCleanupProlog", () => {
  it("detaches and terminates prolog without throwing", async () => {
    const queryFn = mock(() => Promise.resolve(""));
    const terminateFn = mock(() => Promise.resolve());
    const prolog: MockProlog = { query: queryFn, terminate: terminateFn };

    await safeCleanupProlog(prolog);

    expect(queryFn).toHaveBeenCalledWith("kb_detach");
    expect(terminateFn).toHaveBeenCalledTimes(1);
  });

  it("still terminates if detach throws", async () => {
    const queryFn = mock(() => Promise.reject(new Error("detach failed")));
    const terminateFn = mock(() => Promise.resolve());
    const prolog: MockProlog = { query: queryFn, terminate: terminateFn };

    await safeCleanupProlog(prolog);

    expect(terminateFn).toHaveBeenCalledTimes(1);
  });

  it("does not throw if terminate throws", async () => {
    const queryFn = mock(() => Promise.resolve(""));
    const terminateFn = mock(() =>
      Promise.reject(new Error("terminate failed")),
    );
    const prolog: MockProlog = { query: queryFn, terminate: terminateFn };

    await expect(safeCleanupProlog(prolog)).resolves.toBeUndefined();
  });

  it("handles null/undefined prolog gracefully", async () => {
    await expect(safeCleanupProlog(null)).resolves.toBeUndefined();
    await expect(safeCleanupProlog(undefined)).resolves.toBeUndefined();
  });
});
