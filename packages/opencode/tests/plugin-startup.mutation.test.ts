import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getGuidanceCache } from "../src/guidance-cache";
import * as logger from "../src/logger";
import { resolveCurrentBranch, runPluginStartup } from "../src/plugin-startup";
import type { SchedulerOptions, SyncScheduler } from "../src/scheduler";

type Globals = typeof globalThis & {
  __kibi_test_scheduler_factory?: (options: SchedulerOptions) => SyncScheduler;
  __kibi_test_scheduler_factory_by_worktree?: Map<
    string,
    (options: SchedulerOptions) => SyncScheduler
  >;
};
const globals = globalThis as Globals;

const roots: string[] = [];
const originalBranch = process.env.KIBI_BRANCH;

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  globals.__kibi_test_scheduler_factory = undefined;
  globals.__kibi_test_scheduler_factory_by_worktree = undefined;
  if (originalBranch === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  } else {
    process.env.KIBI_BRANCH = originalBranch;
  }
  logger.resetClient();
  logger._setConsoleError(null);
});

function tmp(): string {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-startup-mut-")),
  );
  roots.push(root);
  return root;
}

function write(root: string, rel: string, content = ""): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const TARGETS = [
  ".kb/requirements/",
  ".kb/scenarios/",
  ".kb/tests/",
  ".kb/adr/",
  ".kb/flags/",
  ".kb/events/",
  ".kb/facts/",
];

/** A workspace with a complete root KB. */
function activeRoot(config?: unknown): string {
  const root = tmp();
  write(root, ".kb/manifest.json", "{}");
  for (const dir of TARGETS)
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  write(root, ".kb/symbols.yaml", "symbols: []\n");
  if (config !== undefined) {
    write(root, ".opencode/kibi.json", JSON.stringify(config));
  }
  return root;
}

function client() {
  const bodies: Array<Record<string, unknown>> = [];
  logger._setConsoleError(() => {});
  return {
    bodies,
    client: {
      app: {
        log: async ({ body }: { body: Record<string, unknown> }) => {
          bodies.push(body);
        },
      },
    },
  };
}

function stubScheduler(): SyncScheduler {
  return {
    scheduleSync() {},
    onFileEdited() {},
    onToolExecuteAfter() {},
    flush: async () => {},
    dispose() {},
  } as unknown as SyncScheduler;
}

function messages(bodies: Array<Record<string, unknown>>): unknown[] {
  return bodies.map((body) => body.message);
}

describe("resolveCurrentBranch", () => {
  test("KIBI_BRANCH is trimmed; blank falls back to git", () => {
    const root = tmp();
    execSync("git init -q -b topic", { cwd: root });
    process.env.KIBI_BRANCH = "  feature  ";
    expect(resolveCurrentBranch(root)).toBe("feature");
    process.env.KIBI_BRANCH = "   ";
    expect(resolveCurrentBranch(root)).toBe("topic");
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    expect(resolveCurrentBranch(root)).toBe("topic");
    expect(resolveCurrentBranch(path.join(root, "missing"))).toBe("unknown");
  });
});

describe("runPluginStartup", () => {
  test("a disabled plugin only says so", async () => {
    const root = activeRoot({ enabled: false });
    const { bodies, client: c } = client();
    logger.setClient(c as never);
    expect(
      await runPluginStartup({ directory: root, worktree: root } as never),
    ).toBeNull();
    expect(messages(bodies)).toEqual(["kibi-opencode: disabled via config"]);
  });

  test("an active root logs its posture and builds a scheduler", async () => {
    process.env.KIBI_BRANCH = "main";
    const root = activeRoot();
    const { bodies, client: c } = client();
    let options: SchedulerOptions | undefined;
    globals.__kibi_test_scheduler_factory = (opts) => {
      options = opts;
      return stubScheduler();
    };
    const context = await runPluginStartup({
      directory: root,
      worktree: root,
      client: c,
    } as never);
    expect(context?.runtimeOverlay).toEqual({ degraded: false, causes: [] });
    expect(context?.maintenanceDegraded).toBe(false);
    expect(options?.worktree).toBe(root);
    const posture = bodies.find(
      (body) => body.message === "smart-enforcement.posture",
    );
    expect(posture).toEqual({
      service: "kibi-opencode",
      level: "info",
      message: "smart-enforcement.posture",
      event: "smart_enforcement_posture",
      posture: "root_active",
      posture_state: "root_active",
      maintenance_state: "maintenance_available",
      needs_bootstrap: false,
      posture_reason:
        "Root .kb/manifest.json exists and all canonical KB targets resolve",
      reason_code:
        "Root .kb/manifest.json exists and all canonical KB targets resolve",
      smart_enforcement_mode: "advisory",
      effective_mode: context?.getEffectiveMode(),
      static_degraded: false,
      runtime_degraded: false,
      merged_degraded: false,
      overlay_cause: null,
      branch: "main",
    });
    expect(messages(bodies)).toContain("kibi-opencode: setting up hooks");
    expect(messages(bodies)).not.toContain(
      "kibi-opencode: workspace needs Kibi bootstrap",
    );

    // Run results latch the first cause and collect later ones once.
    const meta = {
      worktree: root,
      debounceWindowMs: 0,
      durationMs: 0,
    };
    options?.onRunComplete?.({ ...meta, reason: "manual", exitCode: 0 });
    options?.onRunComplete?.({
      ...meta,
      reason: "smart-enforcement.x",
      exitCode: 1,
      checkExitCode: 0,
    });
    expect(context?.runtimeOverlay.degraded).toBe(false);
    options?.onRunComplete?.({
      ...meta,
      reason: "manual",
      exitCode: 0,
      checkExitCode: 2,
    });
    options?.onRunComplete?.({ ...meta, reason: "manual", exitCode: 1 });
    options?.onRunComplete?.({ ...meta, reason: "manual", exitCode: 1 });
    expect(context?.runtimeOverlay).toEqual({
      degraded: true,
      primaryCause: "scheduler_check_failed",
      causes: ["scheduler_check_failed", "scheduler_sync_failed"],
    });
    expect(context?.getMaintenanceDegraded()).toBe(true);
    const degraded = bodies.filter(
      (body) => body.message === "smart-enforcement.degraded",
    );
    expect(degraded).toEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "smart-enforcement.degraded",
        event: "smart_enforcement_degraded",
        overlay_cause: "scheduler_check_failed",
        runtime_degraded: true,
        static_degraded: false,
        merged_degraded: true,
        maintenance_state: "maintenance_degraded",
        effective_mode: context?.getEffectiveMode(),
      },
    ]);
  });

  test.each([
    ["vendored", (root: string) => write(root, "kibi/package.json", "{}")],
    [
      "uninitialized",
      (root: string) => write(root, ".opencode/kibi.json", "{}"),
    ],
    ["partial", (root: string) => write(root, ".kb/manifest.json", "{}")],
  ])("a %s root is degraded as non-authoritative", async (_name, setup) => {
    const root = tmp();
    setup(root);
    globals.__kibi_test_scheduler_factory = () => stubScheduler();
    const { bodies, client: c } = client();
    const context = await runPluginStartup({
      directory: root,
      worktree: root,
      client: c,
    } as never);
    expect(context?.runtimeOverlay).toEqual({
      degraded: true,
      primaryCause: "non_authoritative_posture",
      causes: ["non_authoritative_posture"],
    });
    const posture = bodies.find(
      (body) => body.message === "smart-enforcement.posture",
    );
    expect(posture?.maintenance_state).toBe("maintenance_degraded");
    expect(posture?.overlay_cause).toBe("non_authoritative_posture");
  });

  test("a hybrid root is authoritative", async () => {
    const root = activeRoot();
    write(root, "kibi/package.json", "{}");
    globals.__kibi_test_scheduler_factory = () => stubScheduler();
    const context = await runPluginStartup({
      directory: root,
      worktree: root,
    } as never);
    expect(context?.runtimeOverlay.degraded).toBe(false);
  });

  test("disabled sync latches and builds no scheduler", async () => {
    const root = activeRoot({ sync: { enabled: false } });
    let built = 0;
    globals.__kibi_test_scheduler_factory = () => {
      built += 1;
      return stubScheduler();
    };
    const context = await runPluginStartup({
      directory: root,
      worktree: root,
    } as never);
    expect(built).toBe(0);
    expect(context?.scheduler).toBeNull();
    expect(context?.runtimeOverlay.causes).toEqual(["sync_disabled"]);
  });

  test("a workspace needing bootstrap is reported", async () => {
    const root = tmp();
    write(root, ".opencode/kibi.json", "{}");
    globals.__kibi_test_scheduler_factory = () => stubScheduler();
    const { bodies, client: c } = client();
    const console: unknown[][] = [];
    logger._setConsoleError((...args: unknown[]) => {
      console.push(args);
    });
    await runPluginStartup({
      directory: root,
      worktree: root,
      client: c,
    } as never);
    expect(console).toContainEqual([
      "[kibi-opencode]",
      "kibi-opencode: workspace needs Kibi bootstrap",
    ]);
    expect(messages(bodies)).toContain(
      "[bootstrap-needed] Workspace missing Kibi bootstrap",
    );
  });

  test("a later startup without a client logs nowhere old", async () => {
    const root = activeRoot();
    globals.__kibi_test_scheduler_factory = () => stubScheduler();
    const { bodies, client: c } = client();
    await runPluginStartup({
      directory: root,
      worktree: root,
      client: c,
    } as never);
    const before = bodies.length;
    await runPluginStartup({ directory: root, worktree: root } as never);
    expect(bodies.length).toBe(before);
  });

  test("a disabled session summary is never logged", async () => {
    const root = activeRoot({
      guidance: { sessionSummary: { enabled: false, logIntervalMs: -1 } },
    });
    globals.__kibi_test_scheduler_factory = () => stubScheduler();
    const { bodies, client: c } = client();
    await runPluginStartup({
      directory: root,
      worktree: root,
      client: c,
    } as never);
    expect(
      messages(bodies).filter((m) => String(m).startsWith("session.summary")),
    ).toEqual([]);
  });

  test("a changed manifest invalidates the workspace cache", async () => {
    const root = activeRoot();
    globals.__kibi_test_scheduler_factory = () => stubScheduler();
    const cache = getGuidanceCache();
    const invalidate = spyOn(cache, "invalidateForWorkspace");
    try {
      await runPluginStartup({ directory: root, worktree: root } as never);
      await runPluginStartup({ directory: root, worktree: root } as never);
      expect(invalidate).not.toHaveBeenCalled();
      write(root, ".kb/manifest.json", '{"changed":true}');
      await runPluginStartup({ directory: root, worktree: root } as never);
      expect(invalidate).toHaveBeenCalledWith(root);
    } finally {
      invalidate.mockRestore();
    }
  });
});
