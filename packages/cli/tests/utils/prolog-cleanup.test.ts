import { describe, expect, it, mock } from "bun:test";
import { safeCleanupProlog } from "../../src/utils/prolog-cleanup.js";

describe("safeCleanupProlog", () => {
  it("detaches and terminates prolog without throwing", async () => {
    const queryFn = mock(() => Promise.resolve(""));
    const terminateFn = mock(() => Promise.resolve());
    const prolog = { query: queryFn, terminate: terminateFn } as any;

    await safeCleanupProlog(prolog);

    expect(queryFn).toHaveBeenCalledWith("kb_detach");
    expect(terminateFn).toHaveBeenCalledTimes(1);
  });

  it("still terminates if detach throws", async () => {
    const queryFn = mock(() => Promise.reject(new Error("detach failed")));
    const terminateFn = mock(() => Promise.resolve());
    const prolog = { query: queryFn, terminate: terminateFn } as any;

    await safeCleanupProlog(prolog);

    expect(terminateFn).toHaveBeenCalledTimes(1);
  });

  it("does not throw if terminate throws", async () => {
    const queryFn = mock(() => Promise.resolve(""));
    const terminateFn = mock(() =>
      Promise.reject(new Error("terminate failed")),
    );
    const prolog = { query: queryFn, terminate: terminateFn } as any;

    await expect(safeCleanupProlog(prolog)).resolves.toBeUndefined();
  });

  it("handles null/undefined prolog gracefully", async () => {
    await expect(safeCleanupProlog(null as any)).resolves.toBeUndefined();
    await expect(safeCleanupProlog(undefined as any)).resolves.toBeUndefined();
  });
});
