import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as configModule from "../src/config.js";
import type { KibiConfig } from "../src/config.js";
import * as guidanceCacheModule from "../src/guidance-cache.js";
import type { PluginInput } from "../src/index.js";
import * as loggerModule from "../src/logger.js";
import * as repoPostureModule from "../src/repo-posture.js";
import type { PostureResult } from "../src/repo-posture.js";
import * as schedulerModule from "../src/scheduler.js";
import type {
  SchedulerOptions,
  SyncRunMetadata,
  SyncScheduler,
} from "../src/scheduler.js";
import * as sessionTrackerModule from "../src/session-tracker.js";
import * as workspaceHealthModule from "../src/workspace-health.js";

type GuidanceCacheStub = {
  invalidateForBranch: ReturnType<typeof mock<(branch: string) => void>>;
  invalidateForWorkspace: ReturnType<typeof mock<(worktree: string) => void>>;
};

type SessionTrackerStub = {
  isSessionExpired: ReturnType<typeof mock<(intervalMs: number) => boolean>>;
  logSummary: ReturnType<typeof mock<() => void>>;
  reset: ReturnType<typeof mock<() => void>>;
  recordWarning: ReturnType<
    typeof mock<(category: string, filePath: string, message: string) => void>
  >;
};

declare global {
  var __kibi_test_scheduler_factory: ((
    options: SchedulerOptions,
  ) => SyncScheduler) | undefined;
  var __kibi_test_scheduler_factory_by_worktree:
    | Map<string, (options: SchedulerOptions) => SyncScheduler>
    | undefined;
}

const execSyncMock = spyOn(childProcess, "execSync");
const readFileSyncMock = spyOn(fs, "readFileSync");
const loadConfigMock = spyOn(configModule, "loadConfig");
const getGuidanceCacheMock = spyOn(
  guidanceCacheModule,
  "getGuidanceCache",
);
const detectPostureMock = spyOn(repoPostureModule, "detectPosture");
const createSyncSchedulerMock = spyOn(
  schedulerModule,
  "createSyncScheduler",
);
const getSessionTrackerMock = spyOn(
  sessionTrackerModule,
  "getSessionTracker",
);
const checkWorkspaceHealthMock = spyOn(
  workspaceHealthModule,
  "checkWorkspaceHealth",
);
const loggerInfoMock = spyOn(loggerModule, "info");
const loggerErrorMock = spyOn(loggerModule, "error");
const loggerResetClientMock = spyOn(loggerModule, "resetClient");
const loggerSetClientMock = spyOn(loggerModule, "setClient");

const { resolveCurrentBranch, runPluginStartup } = await import(
  "../src/plugin-startup.js"
);

afterAll(() => {
  execSyncMock.mockRestore();
  readFileSyncMock.mockRestore();
  loadConfigMock.mockRestore();
  getGuidanceCacheMock.mockRestore();
  detectPostureMock.mockRestore();
  createSyncSchedulerMock.mockRestore();
  getSessionTrackerMock.mockRestore();
  checkWorkspaceHealthMock.mockRestore();
  loggerInfoMock.mockRestore();
  loggerErrorMock.mockRestore();
  loggerResetClientMock.mockRestore();
  loggerSetClientMock.mockRestore();
});

function baseConfig(overrides: Partial<KibiConfig> = {}): KibiConfig {
  return {
    enabled: true,
    prompt: { enabled: true, hookMode: "auto" },
    sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
    ux: {
      toastStartup: true,
      toastFailures: true,
      toastSuccesses: false,
      toastCooldownMs: 10000,
    },
    guidance: {
      dynamic: true,
      warnOnKbEdits: true,
      factFirstDomainRouting: true,
      commentDetection: { enabled: true, minLines: 6 },
      targetedChecks: { enabled: true },
      sessionSummary: { enabled: false, logIntervalMs: 1800000 },
      smartEnforcement: {
        enabled: true,
        mode: "advisory",
        preflightTtlMs: 600000,
        idleResetMs: 1800000,
        degradedMode: "warn-once",
        requireRootKbForStrict: true,
        completionReminder: true,
      },
    },
    logLevel: "info",
    ...overrides,
  };
}

function rootActivePosture(overrides: Partial<PostureResult> = {}): PostureResult {
  return {
    state: "root_active",
    needsBootstrap: false,
    reason: "root-config-valid",
    maintenanceDegraded: false,
    ...overrides,
  };
}

function createCacheStub(): GuidanceCacheStub {
  return {
    invalidateForBranch: mock<(branch: string) => void>(),
    invalidateForWorkspace: mock<(worktree: string) => void>(),
  };
}

function createTrackerStub(expired = false): SessionTrackerStub {
  return {
    isSessionExpired: mock<(intervalMs: number) => boolean>(() => expired),
    logSummary: mock<() => void>(),
    reset: mock<() => void>(),
    recordWarning: mock<
      (category: string, filePath: string, message: string) => void
    >(),
  };
}

function createSchedulerStub(): SyncScheduler {
  return {
    scheduleSync: mock<(reason: string, filePath?: string) => void>(),
    onFileEdited: mock<(filePath: string) => void>(),
    onToolExecuteAfter: mock<(reason?: string) => void>(),
    flush: mock<() => Promise<void>>(() => Promise.resolve()),
    dispose: mock<() => void>(),
  };
}

function mockExecSyncString(
  implementation: (command: string, options?: object) => string,
): void {
  execSyncMock.mockImplementation(
    implementation as typeof childProcess.execSync,
  );
}

function mockReadFileSyncString(
  implementation: (filePath: string, encoding?: object | string) => string,
): void {
  readFileSyncMock.mockImplementation(implementation as typeof fs.readFileSync);
}

function setupStartupDefaults(configOverrides: Partial<KibiConfig> = {}) {
  const cache = createCacheStub();
  const tracker = createTrackerStub();
  const scheduler = createSchedulerStub();

  loadConfigMock.mockImplementation(() => baseConfig(configOverrides));
  detectPostureMock.mockImplementation(() => rootActivePosture());
  checkWorkspaceHealthMock.mockImplementation(() => ({
    needsBootstrap: false,
    missingConfig: false,
    missingDocDirs: [],
    hasKbEvidence: true,
  }));
  getGuidanceCacheMock.mockImplementation(
    () =>
      cache as unknown as ReturnType<
        typeof guidanceCacheModule.getGuidanceCache
      >,
  );
  getSessionTrackerMock.mockImplementation(
    () =>
      tracker as unknown as ReturnType<
        typeof sessionTrackerModule.getSessionTracker
      >,
  );
  createSyncSchedulerMock.mockImplementation(() => scheduler);
  mockExecSyncString(() => "main\n");
  mockReadFileSyncString(() => "config-a");

  return { cache, tracker, scheduler };
}

function input(worktree: string): PluginInput {
  return { directory: `/project/${worktree}`, worktree: `/work/${worktree}` };
}

describe("plugin-startup branch resolution", () => {
  let originalBranch: string | undefined;

  beforeEach(() => {
    originalBranch = process.env.KIBI_BRANCH;
    execSyncMock.mockReset();
  });

  afterEach(() => {
    if (originalBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });

  test("normalizes KIBI_BRANCH=master to main", () => {
    process.env.KIBI_BRANCH = "master";

    expect(resolveCurrentBranch("/repo")).toBe("main");
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  test("returns non-master KIBI_BRANCH unchanged", () => {
    process.env.KIBI_BRANCH = "feat-x";

    expect(resolveCurrentBranch("/repo")).toBe("feat-x");
  });

  test("normalizes git master branch to main", () => {
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    mockExecSyncString(() => "master\n");

    expect(resolveCurrentBranch("/repo")).toBe("main");
  });

  test("returns unknown when git branch lookup fails", () => {
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    mockExecSyncString(() => {
      throw new Error("git unavailable");
    });

    expect(resolveCurrentBranch("/repo")).toBe("unknown");
  });
});

describe("plugin-startup runtime behavior", () => {
  let originalBranch: string | undefined;

  beforeEach(() => {
    originalBranch = process.env.KIBI_BRANCH;
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    globalThis.__kibi_test_scheduler_factory = undefined;
    globalThis.__kibi_test_scheduler_factory_by_worktree = undefined;
    for (const fn of [
      execSyncMock,
      readFileSyncMock,
      loadConfigMock,
      getGuidanceCacheMock,
      detectPostureMock,
      createSyncSchedulerMock,
      getSessionTrackerMock,
      checkWorkspaceHealthMock,
      loggerInfoMock,
      loggerErrorMock,
      loggerResetClientMock,
      loggerSetClientMock,
    ]) {
      fn.mockReset();
    }
  });

  afterEach(() => {
    globalThis.__kibi_test_scheduler_factory = undefined;
    globalThis.__kibi_test_scheduler_factory_by_worktree = undefined;
    if (originalBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });

  test("logs and resets an expired session summary", async () => {
    setupStartupDefaults({
      guidance: {
        ...baseConfig().guidance,
        sessionSummary: { enabled: true, logIntervalMs: 1234 },
      },
      sync: { ...baseConfig().sync, enabled: false },
    });
    const tracker = createTrackerStub(true);
    getSessionTrackerMock.mockImplementation(
      () =>
        tracker as unknown as ReturnType<
          typeof sessionTrackerModule.getSessionTracker
        >,
    );

    await runPluginStartup(input("summary"));

    expect(tracker.isSessionExpired).toHaveBeenCalledWith(1234);
    expect(tracker.logSummary).toHaveBeenCalledTimes(1);
    expect(tracker.reset).toHaveBeenCalledTimes(1);
  });

  test("uses missing config fingerprint without invalidating unchanged cache", async () => {
    const { cache } = setupStartupDefaults({
      sync: { ...baseConfig().sync, enabled: false },
    });
    mockReadFileSyncString(() => {
      throw new Error("ENOENT");
    });
    const unchanged = input("missing-config");

    await runPluginStartup(unchanged);
    await runPluginStartup(unchanged);

    expect(cache.invalidateForBranch).not.toHaveBeenCalled();
    expect(cache.invalidateForWorkspace).not.toHaveBeenCalled();
  });

  test("invalidates the previous branch cache when branch changes", async () => {
    const { cache } = setupStartupDefaults({
      sync: { ...baseConfig().sync, enabled: false },
    });
    const branches = ["feature-a\n", "feature-b\n"];
    mockExecSyncString(() => branches.shift() ?? "feature-b\n");
    const sameWorkspace = input("branch-change");

    await runPluginStartup(sameWorkspace);
    await runPluginStartup(sameWorkspace);

    expect(cache.invalidateForBranch).toHaveBeenCalledWith("feature-a");
  });

  test("invalidates the workspace cache when posture changes", async () => {
    const { cache } = setupStartupDefaults({
      sync: { ...baseConfig().sync, enabled: false },
    });
    const postures: PostureResult[] = [
      rootActivePosture(),
      rootActivePosture({ state: "root_partial", maintenanceDegraded: true }),
    ];
    detectPostureMock.mockImplementation(() => postures.shift() ?? postures[0]);
    const sameWorkspace = input("posture-change");

    await runPluginStartup(sameWorkspace);
    await runPluginStartup(sameWorkspace);

    expect(cache.invalidateForWorkspace).toHaveBeenCalledWith(
      sameWorkspace.worktree,
    );
  });

  test("invalidates the workspace cache when config fingerprint changes", async () => {
    const { cache } = setupStartupDefaults({
      sync: { ...baseConfig().sync, enabled: false },
    });
    const fingerprints = ["config-a", "config-b"];
    mockReadFileSyncString(() => fingerprints.shift() ?? "config-b");
    const sameWorkspace = input("config-change");

    await runPluginStartup(sameWorkspace);
    await runPluginStartup(sameWorkspace);

    expect(cache.invalidateForWorkspace).toHaveBeenCalledWith(
      sameWorkspace.worktree,
    );
  });

  test("scheduler completion ignores missing and smart-enforcement reasons", async () => {
    setupStartupDefaults();
    let onRunComplete: ((meta: SyncRunMetadata) => void) | undefined;
    globalThis.__kibi_test_scheduler_factory = (options) => {
      onRunComplete = options.onRunComplete;
      return createSchedulerStub();
    };

    const context = await runPluginStartup(input("scheduler-smart"));

    onRunComplete?.({
      reason: "smart-enforcement.sync.trailing",
      worktree: "/work/scheduler-smart",
      debounceWindowMs: 0,
      durationMs: 0,
      exitCode: 1,
    });
    onRunComplete?.({
      reason: "smart-enforcement.sync",
      worktree: "/work/scheduler-smart",
      debounceWindowMs: 0,
      durationMs: 0,
      exitCode: 1,
    });

    expect(context?.runtimeOverlay.degraded).toBe(false);
  });

  test("scheduler completion latches sync failures for falsy and non-smart reasons", async () => {
    setupStartupDefaults();
    let onRunComplete: ((meta: SyncRunMetadata) => void) | undefined;
    globalThis.__kibi_test_scheduler_factory = (options) => {
      onRunComplete = options.onRunComplete;
      return createSchedulerStub();
    };

    const context = await runPluginStartup(input("scheduler-sync-failure"));

    onRunComplete?.({
      reason: "",
      worktree: "/work/scheduler-sync-failure",
      debounceWindowMs: 0,
      durationMs: 0,
      exitCode: 1,
    });
    onRunComplete?.({
      reason: "manual",
      worktree: "/work/scheduler-sync-failure",
      debounceWindowMs: 0,
      durationMs: 0,
      exitCode: 1,
    });

    expect(context?.runtimeOverlay.primaryCause).toBe("scheduler_sync_failed");
    expect(context?.runtimeOverlay.causes).toEqual(["scheduler_sync_failed"]);
  });

  test("scheduler completion latches check failures", async () => {
    setupStartupDefaults();
    let onRunComplete: ((meta: SyncRunMetadata) => void) | undefined;
    globalThis.__kibi_test_scheduler_factory = (options) => {
      onRunComplete = options.onRunComplete;
      return createSchedulerStub();
    };

    const context = await runPluginStartup(input("scheduler-check-failure"));

    onRunComplete?.({
      reason: "smart-enforcement.sync",
      worktree: "/work/scheduler-check-failure",
      debounceWindowMs: 0,
      durationMs: 0,
      exitCode: 0,
      checkExitCode: 2,
    });

    expect(context?.runtimeOverlay.primaryCause).toBe("scheduler_check_failed");
  });

  test("scheduler factory exceptions degrade startup without throwing", async () => {
    setupStartupDefaults();
    globalThis.__kibi_test_scheduler_factory = () => {
      throw new Error("factory failed");
    };

    const context = await runPluginStartup(input("scheduler-unavailable"));

    expect(context?.scheduler).toBeNull();
    expect(context?.runtimeOverlay.primaryCause).toBe("scheduler_unavailable");
  });

});
