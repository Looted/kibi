import { describe, expect, test } from "bun:test";
import { DEFAULTS } from "../src/config";
import {
  type KibiCheckpointContext,
  KibiCheckpointRunner,
} from "../src/kibi-checkpoint-runner";
import type { SyncRunMetadata } from "../src/scheduler";

const enabledConfig = {
  ...DEFAULTS,
  sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 0 },
};

function context(
  overrides: Partial<KibiCheckpointContext> = {},
  work: Partial<KibiCheckpointContext["workContext"]> = {},
): KibiCheckpointContext {
  return {
    workContext: {
      worktreeRoot: process.cwd(),
      kibiAuthorityRoot: process.cwd(),
      branch: "main",
      repoRelativePath: "src/a.ts",
      posture: "root_active",
      isAuthoritative: true,
      isLinkedWorktree: false,
      sessionId: "s-1",
      agentIdentity: "agent-1",
      ...work,
    },
    hardGuidanceText: "Run the checkpoint.",
    config: enabledConfig,
    ...overrides,
  };
}

function passingRunner(
  extra: ConstructorParameters<typeof KibiCheckpointRunner>[0] = {},
) {
  return new KibiCheckpointRunner({
    runSync: async () => ({ exitCode: 0 }),
    runCheck: async () => ({ exitCode: 0 }),
    ...extra,
  });
}

describe("requestCheckpoint", () => {
  test("a non-authoritative root is skipped with full metadata", () => {
    const runner = passingRunner();
    const result = runner.requestCheckpoint(
      context({}, { isAuthoritative: false }),
      "  fp-1  ",
    );
    expect(result.kind).toBe("skip");
    expect(result.metadata).toEqual({
      fingerprint: "fp-1",
      scopeKey: result.metadata.scopeKey,
      worktree: process.cwd(),
      branch: "main",
      sessionId: "s-1",
      agentIdentity: "agent-1",
      reason: "non_authoritative",
    });
    expect(result.metadata.scopeKey).toContain("fp-1");
  });

  test("a blank fingerprint becomes clean and no session leaves no sessionId", () => {
    const runner = passingRunner();
    const result = runner.requestCheckpoint(
      context({}, { sessionId: undefined }),
      "   ",
    );
    expect(result.metadata.fingerprint).toBe("clean");
    expect("sessionId" in result.metadata).toBe(false);
  });

  test("blank hard guidance blocks without recording a request", async () => {
    const runner = passingRunner();
    const ctx = context({ hardGuidanceText: "  \n " });
    const result = runner.requestCheckpoint(ctx, "fp");
    expect(result.kind).toBe("hard_block");
    expect(result.metadata.guidanceRendered).toBe(false);
    expect(result.metadata.reason).toBe("hard_guidance_not_rendered");
    const run = await runner.runCheckpoint(ctx, "fp");
    expect(run.metadata.reason).toBe("checkpoint_not_requested");
  });

  test("given guidance is kept verbatim", () => {
    const runner = passingRunner();
    const result = runner.requestCheckpoint(
      context({ hardGuidanceText: " Text \n" }),
      "fp",
    );
    expect(result.kind).toBe("requested");
    expect(result.metadata.guidanceRendered).toBe(true);
    expect(result.metadata.guidanceText).toBe(" Text \n");
  });

  test("without given guidance the hard policy text is rendered", () => {
    const runner = passingRunner();
    const result = runner.requestCheckpoint(
      context({ hardGuidanceText: undefined }),
      "fp",
    );
    expect(result.kind).toBe("requested");
    expect(typeof result.metadata.guidanceText).toBe("string");
    expect(result.metadata.guidanceText?.length).toBeGreaterThan(0);
  });

  test("a policy that does not hard-block renders no guidance", () => {
    const runner = passingRunner();
    const result = runner.requestCheckpoint(
      context({ hardGuidanceText: undefined, lifecycleEvents: [] }),
      "fp",
    );
    expect(result.kind).toBe("hard_block");
    expect(result.metadata.reason).toBe("hard_guidance_not_rendered");
  });
});

describe("isCheckpointPassed without a context", () => {
  test("any passed scope for the fingerprint counts", async () => {
    const runner = passingRunner();
    expect(runner.isCheckpointPassed("fp")).toBe(false);
    const a = context();
    const b = context({}, { sessionId: "s-2" });
    runner.requestCheckpoint(a, "fp");
    runner.requestCheckpoint(b, "fp");
    expect((await runner.runCheckpoint(a, "fp")).kind).toBe("passed");
    expect(runner.isCheckpointPassed(" fp ")).toBe(true);
    expect(runner.isCheckpointPassed("other")).toBe(false);
    expect((await runner.runCheckpoint(b, "fp")).kind).toBe("passed");
    expect(runner.isCheckpointPassed("fp", a)).toBe(true);
    expect(runner.isCheckpointPassed("fp", b)).toBe(true);
    expect(
      runner.isCheckpointPassed("fp", context({}, { sessionId: "s-3" })),
    ).toBe(false);
  });
});

describe("runCheckpoint", () => {
  test("a disabled sync never runs and blocks", async () => {
    const runner = passingRunner();
    const ctx = context({
      config: { ...DEFAULTS, sync: { ...DEFAULTS.sync, enabled: false } },
      checkRules: ["rule-a"],
    });
    runner.requestCheckpoint(ctx, "fp");
    const result = await runner.runCheckpoint(ctx, "fp");
    expect(result.kind).toBe("hard_block");
    expect(result.metadata.reason).toBe("sync_not_run");
    expect(result.metadata.checkRules).toEqual(["rule-a"]);
    expect(result.metadata.guidanceText).toBe("Run the checkpoint.");
  });

  test("the runner config is used when the context has none", async () => {
    const runner = passingRunner({
      config: { ...DEFAULTS, sync: { ...DEFAULTS.sync, enabled: false } },
    });
    const ctx = context({ config: undefined });
    runner.requestCheckpoint(ctx, "fp");
    expect((await runner.runCheckpoint(ctx, "fp")).metadata.reason).toBe(
      "sync_not_run",
    );
  });

  test("a pass reports the sync, empty rules and calls back", async () => {
    const seen: SyncRunMetadata[] = [];
    let checks = 0;
    const runner = passingRunner({
      runCheck: async () => {
        checks += 1;
        return { exitCode: 0 };
      },
      onRunComplete: (meta) => seen.push(meta),
    });
    const ctx = context({ checkRules: [] });
    runner.requestCheckpoint(ctx, "fp");
    const result = await runner.runCheckpoint(ctx, "fp");
    expect(result.kind).toBe("passed");
    expect(result.metadata.checkRules).toBeUndefined();
    expect(result.metadata.sync).toBe(seen[0] as SyncRunMetadata);
    expect(seen).toHaveLength(1);
    expect(checks).toBe(0);
    expect(result.metadata.reason).toBeUndefined();
  });

  test("check rules are copied, not shared", async () => {
    const rules = ["rule-a"];
    const runner = passingRunner();
    const ctx = context({ checkRules: rules });
    runner.requestCheckpoint(ctx, "fp");
    const result = await runner.runCheckpoint(ctx, "fp");
    expect(result.kind).toBe("passed");
    expect(result.metadata.checkRules).toEqual(["rule-a"]);
    expect(result.metadata.checkRules).not.toBe(rules);
  });

  test("a failing check without rules still passes", async () => {
    const runner = passingRunner({ runCheck: async () => ({ exitCode: 1 }) });
    const ctx = context({ checkRules: undefined });
    runner.requestCheckpoint(ctx, "fp");
    expect((await runner.runCheckpoint(ctx, "fp")).kind).toBe("passed");
  });

  test("the timeout handle is cleared after a finished run", async () => {
    const cleared: unknown[] = [];
    const delays: number[] = [];
    const runner = passingRunner({
      timeoutMs: 1234,
      setTimeoutFn: (_fn, ms) => {
        delays.push(ms);
        return 42 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeoutFn: (handle) => cleared.push(handle),
    });
    const ctx = context();
    runner.requestCheckpoint(ctx, "fp");
    expect((await runner.runCheckpoint(ctx, "fp")).kind).toBe("passed");
    expect(delays).toEqual([1234]);
    expect(cleared).toEqual([42]);
  });

  test("the default timeout is thirty seconds", async () => {
    const delays: number[] = [];
    const runner = passingRunner({
      setTimeoutFn: (_fn, ms) => {
        delays.push(ms);
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeoutFn: () => {},
    });
    const ctx = context();
    runner.requestCheckpoint(ctx, "fp");
    await runner.runCheckpoint(ctx, "fp");
    expect(delays).toEqual([30_000]);
  });
});
