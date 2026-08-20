import { afterEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createAutoUpdateRunner,
  findKibiOpencodePluginEntry,
  getCachedPluginVersion,
  getLatestPluginVersion,
  invalidateKibiOpencodePackage,
} from "../src/auto-update.js";
import { getE2eCoverageSignal } from "../src/e2e-coverage-signals.js";
import { computeEnforcementPolicy } from "../src/enforcement-policy.js";
import { buildDirtyRelevantFingerprint } from "../src/enforcement-scope.js";
import {
  getFileLinkedEntityIds,
  parseSymbolsYaml,
} from "../src/file-entity-links.js";
import { createFileOperationState } from "../src/file-operation-state.js";
import {
  detectInitKibiCommandCapability,
  findSdkPackageJsonForPluginRoot,
  registerInitKibiCommand,
} from "../src/init-kibi-capability.js";
import {
  createKbFreshnessEvidenceStore,
  evaluateKbFreshness,
} from "../src/kb-freshness-state.js";
import * as logger from "../src/logger.js";
import { classifyMeaningfulChange } from "../src/meaningful-change-classifier.js";
import kibiOpencodePlugin from "../src/plugin.js";
import type { PluginInput } from "../src/plugin.js";
import { buildPrompt } from "../src/prompt.js";
import { reconcileAuditEntries } from "../src/reconcile-engine.js";
import type { SyncRunMetadata } from "../src/scheduler.js";
import { computeEffectiveMode } from "../src/smart-enforcement.js";
import { notifyStartup } from "../src/startup-notifier.js";
import { readKibiPackageVersions } from "../src/version-metadata.js";
import { resolveWorkContext } from "../src/work-context-resolver.js";

type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

type CapturedClient = {
  client: NonNullable<PluginInput["client"]>;
  logs: Record<string, unknown>[];
  toasts: ToastPayload[];
};

type ScheduledSync = {
  reason: string;
  filePath?: string;
  checkRules?: string[];
};

type PlatformValue = NodeJS.Platform;

const globals = globalThis as typeof globalThis & {
  __kibi_test_scheduler_factory?: (options: {
    worktree: string;
    config: unknown;
    onRunComplete?: (meta: SyncRunMetadata) => void;
  }) => {
    scheduleSync: (
      reason: string,
      filePath?: string,
      checkRules?: string[],
    ) => void;
    onFileEdited: () => void;
    onToolExecuteAfter: () => void;
    flush: () => Promise<void>;
    dispose: () => void;
  };
  __kibi_test_scheduler_factory_by_worktree?: Map<
    string,
    (options: {
      worktree: string;
      config: unknown;
      onRunComplete?: (meta: SyncRunMetadata) => void;
    }) => {
      scheduleSync: (
        reason: string,
        filePath?: string,
        checkRules?: string[],
      ) => void;
      onFileEdited: () => void;
      onToolExecuteAfter: () => void;
      flush: () => Promise<void>;
      dispose: () => void;
    }
  >;
  __kibi_test_schedule_startup_notify?: (
    callback: () => void,
    delayMs: number,
  ) => void;
  __kibi_test_auto_update_runner?: (input: {
    directory: string;
    enabled: boolean;
  }) => Promise<{ status: string }>;
};

const originalXdgCacheHome = process.env.XDG_CACHE_HOME;
const originalAppData = process.env.APPDATA;
const originalLocalAppData = process.env.LOCALAPPDATA;
const originalFetch = globalThis.fetch;
const originalPlatform = process.platform;

function withPlatform(platform: PlatformValue): void {
  Object.defineProperty(process, "platform", { value: platform });
}

function restoreProcessState(): void {
  Object.defineProperty(process, "platform", { value: originalPlatform });
  if (originalXdgCacheHome === undefined) {
    Reflect.deleteProperty(process.env, "XDG_CACHE_HOME");
  } else {
    process.env.XDG_CACHE_HOME = originalXdgCacheHome;
  }
  if (originalAppData === undefined) {
    Reflect.deleteProperty(process.env, "APPDATA");
  } else {
    process.env.APPDATA = originalAppData;
  }
  if (originalLocalAppData === undefined) {
    Reflect.deleteProperty(process.env, "LOCALAPPDATA");
  } else {
    process.env.LOCALAPPDATA = originalLocalAppData;
  }
  globalThis.fetch = originalFetch;
  globals.__kibi_test_scheduler_factory = undefined;
  globals.__kibi_test_scheduler_factory_by_worktree = undefined;
  globals.__kibi_test_schedule_startup_notify = undefined;
  globals.__kibi_test_auto_update_runner = undefined;
  logger.resetClient();
  logger._setConsoleError(null);
}

afterEach(() => {
  mock.restore();
  restoreProcessState();
});

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeWorkspace(prefix: string): string {
  const tmpDir = makeTempDir(prefix);
  fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, ".opencode"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".kb", "manifest.json"), "{}\n");
  for (const dir of [
    ".kb/requirements",
    ".kb/scenarios",
    ".kb/tests",
    ".kb/adr",
    ".kb/flags",
    ".kb/events",
    ".kb/facts",
    "src",
  ]) {
    fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(tmpDir, ".kb", "symbols.yaml"), "[]\n");
  return tmpDir;
}

function writePluginConfig(
  tmpDir: string,
  config: Record<string, unknown>,
): void {
  fs.writeFileSync(
    path.join(tmpDir, ".opencode", "kibi.json"),
    `${JSON.stringify(config)}\n`,
  );
}

function makeProjectWithPlugins(plugins: readonly string[]): string {
  const tmpDir = makeTempDir("kibi-auto-update-more-");
  fs.writeFileSync(
    path.join(tmpDir, "opencode.jsonc"),
    `// comment\n${JSON.stringify({ plugin: plugins })}\n`,
  );
  return tmpDir;
}

function makeClient(): CapturedClient {
  const logs: Record<string, unknown>[] = [];
  const toasts: ToastPayload[] = [];
  return {
    logs,
    toasts,
    client: {
      tui: {
        toast: async (payload) => {
          toasts.push(payload);
        },
        showToast: async ({ body }) => {
          toasts.push(body);
        },
        clearPrompt: async () => {},
        submitPrompt: async () => {},
      },
      app: {
        log: async (payload) => {
          logs.push(payload);
        },
      },
    },
  };
}

function installSchedulerStub(scheduled: ScheduledSync[]): void {
  globals.__kibi_test_scheduler_factory = () => ({
    scheduleSync: (reason, filePath, checkRules) => {
      scheduled.push({
        reason,
        ...(filePath !== undefined ? { filePath } : {}),
        ...(checkRules !== undefined ? { checkRules } : {}),
      });
    },
    onFileEdited: () => {},
    onToolExecuteAfter: () => {},
    flush: async () => {},
    dispose: () => {},
  });
}

function logMessages(logs: readonly Record<string, unknown>[]): string {
  return logs
    .map((payload) => {
      const body = payload.body;
      if (body && typeof body === "object" && "message" in body) {
        const message = (body as { message?: unknown }).message;
        return typeof message === "string" ? message : "";
      }
      return "";
    })
    .join("\n");
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("coverage completion for auto-update", () => {
  test("Given malformed and unsupported plugin configs When detecting entry Then null and file pins are handled", () => {
    const malformedDir = makeTempDir("kibi-auto-update-malformed-");
    const fileDir = makeProjectWithPlugins(["file:///tmp/kibi-opencode"]);
    try {
      fs.writeFileSync(path.join(malformedDir, "opencode.json"), "{broken");

      expect(findKibiOpencodePluginEntry(malformedDir)).toBeNull();
      expect(findKibiOpencodePluginEntry(fileDir)).toEqual({
        entry: "file:///tmp/kibi-opencode",
        isPinned: true,
        requestedVersion: null,
        configPath: path.join(fileDir, "opencode.jsonc"),
      });
    } finally {
      fs.rmSync(malformedDir, { recursive: true, force: true });
      fs.rmSync(fileDir, { recursive: true, force: true });
    }
  });

  test("Given platform-specific caches When reading cached version Then each cache root is considered", () => {
    const tmpDir = makeTempDir("kibi-auto-update-platform-");
    try {
      withPlatform("win32");
      process.env.APPDATA = path.join(tmpDir, "roaming");
      process.env.LOCALAPPDATA = path.join(tmpDir, "local");
      const winPackage = path.join(
        tmpDir,
        "roaming",
        "opencode",
        "node_modules",
        "kibi-opencode",
        "package.json",
      );
      fs.mkdirSync(path.dirname(winPackage), { recursive: true });
      fs.writeFileSync(winPackage, JSON.stringify({ version: "1.2.3" }));
      expect(getCachedPluginVersion()).toBe("1.2.3");

      fs.rmSync(path.join(tmpDir, "roaming"), { recursive: true, force: true });
      const winCachePackage = path.join(
        tmpDir,
        "local",
        "opencode",
        "node_modules",
        "kibi-opencode",
        "package.json",
      );
      fs.mkdirSync(path.dirname(winCachePackage), { recursive: true });
      fs.writeFileSync(winCachePackage, JSON.stringify({ version: "1.2.4" }));
      expect(getCachedPluginVersion()).toBe("1.2.4");

      withPlatform("darwin");
      const darwinPackage = path.join(
        os.homedir(),
        "Library",
        "Caches",
        "opencode",
        "packages",
        "node_modules",
        "kibi-opencode",
        "package.json",
      );
      fs.mkdirSync(path.dirname(darwinPackage), { recursive: true });
      fs.writeFileSync(darwinPackage, JSON.stringify({ version: "1.2.5" }));
      expect(getCachedPluginVersion()).toBe("1.2.5");
      fs.rmSync(path.join(os.homedir(), "Library", "Caches", "opencode"), {
        recursive: true,
        force: true,
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given registry responses When fetching latest version Then channels fallback and failures return null", async () => {
    const fetchMock = Object.assign(
      mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
        async () =>
          new Response(
            JSON.stringify({ latest: "2.0.0", beta: "2.1.0-beta.1" }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
      ),
      { preconnect: () => {} },
    ) satisfies typeof fetch;
    globalThis.fetch = fetchMock;
    expect(await getLatestPluginVersion("beta")).toBe("2.1.0-beta.1");
    expect(await getLatestPluginVersion("missing")).toBe("2.0.0");

    globalThis.fetch = Object.assign(
      async () => new Response("nope", { status: 503 }),
      { preconnect: () => {} },
    ) satisfies typeof fetch;
    expect(await getLatestPluginVersion()).toBeNull();

    globalThis.fetch = Object.assign(
      async () => {
        throw new Error("network down");
      },
      { preconnect: () => {} },
    ) satisfies typeof fetch;
    expect(await getLatestPluginVersion()).toBeNull();
  });

  test("Given every auto-update outcome When runner executes Then missing versions and install failures are surfaced", async () => {
    const noEntryDir = makeTempDir("kibi-auto-update-no-entry-");
    const pluginDir = makeProjectWithPlugins(["kibi-opencode@latest"]);
    const plainPluginDir = makeProjectWithPlugins(["kibi-opencode"]);
    const failedNotify = mock<(message: string) => Promise<void>>(
      async () => {},
    );
    try {
      const noEntry = createAutoUpdateRunner({
        getCurrentVersion: () => "1.0.0",
        getLatestVersion: async () => "1.0.1",
        invalidatePackage: () => true,
        runInstall: async () => true,
        notify: async () => {},
        log: () => {},
      });
      expect(
        (await noEntry({ directory: noEntryDir, enabled: true })).status,
      ).toBe("plugin-not-found");

      const unknownCurrent = createAutoUpdateRunner({
        getCurrentVersion: () => null,
        getLatestVersion: async () => "1.0.1",
        invalidatePackage: () => true,
        runInstall: async () => true,
        notify: async () => {},
        log: () => {},
      });
      expect(
        (await unknownCurrent({ directory: plainPluginDir, enabled: true }))
          .status,
      ).toBe("current-version-unknown");

      const unknownLatest = createAutoUpdateRunner({
        getCurrentVersion: () => "1.0.0",
        getLatestVersion: async () => null,
        invalidatePackage: () => true,
        runInstall: async () => true,
        notify: async () => {},
        log: () => {},
      });
      expect(
        await unknownLatest({ directory: pluginDir, enabled: true }),
      ).toEqual({
        status: "latest-version-unknown",
        currentVersion: "1.0.0",
      });

      const installFailed = createAutoUpdateRunner({
        getCurrentVersion: () => "1.0.0",
        getLatestVersion: async (channel = "latest") =>
          channel === "latest" ? "1.0.1" : "0.0.0",
        invalidatePackage: () => true,
        runInstall: async () => false,
        notify: failedNotify,
        log: () => {},
      });
      expect(
        (await installFailed({ directory: pluginDir, enabled: true })).status,
      ).toBe("install-failed");
      expect(failedNotify).toHaveBeenCalledWith(
        "kibi-opencode 1.0.1 is available, but automatic install failed.",
      );
    } finally {
      fs.rmSync(noEntryDir, { recursive: true, force: true });
      fs.rmSync(pluginDir, { recursive: true, force: true });
      fs.rmSync(plainPluginDir, { recursive: true, force: true });
    }
  });

  test("Given cache paths are absent When invalidating Then no removal is reported", () => {
    const cacheHome = makeTempDir("kibi-auto-update-empty-cache-");
    try {
      process.env.XDG_CACHE_HOME = cacheHome;
      expect(invalidateKibiOpencodePackage()).toBe(false);
    } finally {
      fs.rmSync(cacheHome, { recursive: true, force: true });
    }
  });

  test("Given edge semver pairs When runner compares versions Then prerelease ordering branches are covered", async () => {
    const projectDir = makeProjectWithPlugins(["kibi-opencode"]);
    const pairs = [
      ["1.0.0-alpha.1", "1.0.0-alpha.2"],
      ["1.0.0-alpha.2", "1.0.0-alpha.beta"],
      ["1.0.0-alpha.beta", "1.0.0-beta"],
      ["1.0.0-beta", "1.0.0-beta.2"],
      ["1.0.0-beta.2", "1.0.0-beta.11"],
      ["1.0.0-beta.11", "1.0.0-rc.1"],
      ["1.0.0-rc.1", "1.0.0"],
    ] as const;
    try {
      for (const [currentVersion, latestVersion] of pairs) {
        const runner = createAutoUpdateRunner({
          getCurrentVersion: () => currentVersion,
          getLatestVersion: async () => latestVersion,
          invalidatePackage: () => true,
          runInstall: async () => true,
          notify: async () => {},
          log: () => {},
        });
        expect(
          (await runner({ directory: projectDir, enabled: true })).status,
        ).toBe("updated");
      }

      const invalidCurrent = createAutoUpdateRunner({
        getCurrentVersion: () => "not-semver",
        getLatestVersion: async () => "1.0.0",
        invalidatePackage: () => true,
        runInstall: async () => true,
        notify: async () => {},
        log: () => {},
      });
      expect(
        (await invalidCurrent({ directory: projectDir, enabled: true })).status,
      ).toBe("up-to-date");

      const hugeVersion = `${"9".repeat(400)}.0.0`;
      const hugeCurrent = createAutoUpdateRunner({
        getCurrentVersion: () => hugeVersion,
        getLatestVersion: async () => "1.0.0",
        invalidatePackage: () => true,
        runInstall: async () => true,
        notify: async () => {},
        log: () => {},
      });
      expect(
        (await hugeCurrent({ directory: projectDir, enabled: true })).status,
      ).toBe("up-to-date");
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("Given non-object config and running package fallback When detecting versions Then parser fallback branches are covered", () => {
    const configDir = makeTempDir("kibi-auto-update-array-config-");
    const cacheHome = makeTempDir("kibi-auto-update-running-package-");
    try {
      fs.writeFileSync(path.join(configDir, "opencode.json"), "[]");
      expect(findKibiOpencodePluginEntry(configDir)).toBeNull();

      process.env.XDG_CACHE_HOME = cacheHome;
      expect(getCachedPluginVersion()).toMatch(/^\d+\.\d+\.\d+/);
    } finally {
      fs.rmSync(configDir, { recursive: true, force: true });
      fs.rmSync(cacheHome, { recursive: true, force: true });
    }
  });

  test("Given mocked child process When running install Then active workspace selection is covered", async () => {
    const cacheHome = makeTempDir("kibi-auto-update-install-");
    try {
      process.env.XDG_CACHE_HOME = cacheHome;
      const configPackageJson = path.join(
        os.homedir(),
        ".config",
        "opencode",
        "node_modules",
        "kibi-opencode",
        "package.json",
      );
      fs.mkdirSync(path.dirname(configPackageJson), { recursive: true });
      fs.writeFileSync(configPackageJson, JSON.stringify({ version: "1.0.0" }));
      const execCalls: Array<{ command: string; args: string[]; cwd: string }> =
        [];
      mock.module("node:child_process", () => ({
        execFile: (
          command: string,
          args: string[],
          options: { cwd: string },
          callback: (error: Error | null) => void,
        ) => {
          execCalls.push({ command, args, cwd: options.cwd });
          callback(null);
        },
      }));
      const freshAutoUpdate = await import(
        new URL("../src/auto-update.ts?run-install", import.meta.url).href
      );

      expect(await freshAutoUpdate.runBunInstallForOpenCodePlugin()).toBe(true);
      expect(execCalls[0]).toEqual({
        command: "bun",
        args: ["install"],
        cwd: path.join(os.homedir(), ".config", "opencode"),
      });
      fs.rmSync(path.join(os.homedir(), ".config", "opencode"), {
        recursive: true,
        force: true,
      });
    } finally {
      fs.rmSync(cacheHome, { recursive: true, force: true });
    }
  });
});

describe("coverage completion for init-kibi capability", () => {
  test("Given direct detection inputs When unsupported surfaces are missing Then reason includes version when present", () => {
    expect(
      detectInitKibiCommandCapability({
        pluginVersion: "1.4.7",
        pluginHooksDts: "export interface Hooks { event?: () => void; }",
        sdkTypesDts: "export interface Config {}",
      }),
    ).toEqual({
      supported: false,
      pluginVersion: "1.4.7",
      reason:
        "@opencode-ai/plugin@1.4.7 Hooks interface does not expose the config hook needed for native command injection.",
    });

    expect(
      detectInitKibiCommandCapability({
        pluginVersion: "1.4.7",
        pluginHooksDts:
          "export interface Hooks { config?: (input: Config) => Promise<void>; }",
      }),
    ).toEqual({
      supported: false,
      pluginVersion: "1.4.7",
      reason:
        "@opencode-ai/plugin@1.4.7 SDK Config definition is unavailable for command surface inspection.",
    });
  });

  test("Given config hook receives invalid input When registering command Then unsupported reasons are returned", () => {
    const capability = { supported: true, pluginVersion: "1.4.7" } as const;

    expect(registerInitKibiCommand(null, capability)).toEqual({
      supported: false,
      pluginVersion: "1.4.7",
      reason: "@opencode-ai/plugin@1.4.7 config hook input is not an object.",
    });

    expect(registerInitKibiCommand({ command: [] }, capability)).toEqual({
      supported: false,
      pluginVersion: "1.4.7",
      reason:
        "@opencode-ai/plugin@1.4.7 config hook input.command is not an object.",
    });
  });

  test("Given dogfood host artifacts When detecting capability Then native command support is discovered", async () => {
    const tmpDir = makeTempDir("kibi-init-capability-dogfood-");
    const originalCwd = process.cwd();
    try {
      const pluginRoot = path.join(
        tmpDir,
        ".opencode",
        "node_modules",
        "@opencode-ai",
        "plugin",
      );
      const sdkRoot = path.join(
        tmpDir,
        ".opencode",
        "node_modules",
        "@opencode-ai",
        "sdk",
      );
      fs.mkdirSync(path.join(pluginRoot, "dist"), { recursive: true });
      fs.mkdirSync(path.join(sdkRoot, "dist", "v2", "gen"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(pluginRoot, "package.json"),
        JSON.stringify({ version: "9.9.9" }),
      );
      fs.writeFileSync(path.join(sdkRoot, "package.json"), JSON.stringify({}));
      fs.writeFileSync(
        path.join(pluginRoot, "dist", "index.d.ts"),
        "export interface Hooks { config?: (input: Config) => Promise<void>; }",
      );
      fs.writeFileSync(
        path.join(sdkRoot, "dist", "v2", "gen", "types.gen.d.ts"),
        "export interface Config { command?: { [key: string]: { template: string; }; }; }",
      );

      process.chdir(tmpDir);
      const freshCapabilityModule = await import(
        new URL("../src/init-kibi-capability.ts?dogfood", import.meta.url).href
      );
      const capability = freshCapabilityModule.getInitKibiCommandCapability();

      expect(capability.supported).toBe(true);
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given plugin root layouts When finding SDK package Then nested package wins", () => {
    const tmpDir = makeTempDir("kibi-init-sdk-root-");
    try {
      const pluginRoot = path.join(tmpDir, "@opencode-ai", "plugin");
      const nestedSdk = path.join(
        pluginRoot,
        "node_modules",
        "@opencode-ai",
        "sdk",
        "package.json",
      );
      fs.mkdirSync(path.dirname(nestedSdk), { recursive: true });
      fs.writeFileSync(nestedSdk, JSON.stringify({}));

      expect(findSdkPackageJsonForPluginRoot(pluginRoot)).toBe(nestedSdk);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("coverage completion for small pure modules", () => {
  test("Given unparseable e2e doc and doc without frontmatter When checking signal Then no evidence is returned", () => {
    const tmpDir = makeWorkspace("kibi-e2e-more-");
    try {
      fs.writeFileSync(
        path.join(tmpDir, ".kb", "symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-one",
          "    sourceFile: src/feature.ts",
          "    relationships:",
          "      - type: covered_by",
          "        target: TEST-no-frontmatter",
          "      - type: executable_for",
          "        target: TEST-missing",
        ].join("\n"),
      );
      fs.writeFileSync(
        path.join(tmpDir, ".kb", "tests", "TEST-no-frontmatter.md"),
        "plain body names src/other.ts only\n",
      );

      expect(
        getE2eCoverageSignal(tmpDir, path.join(tmpDir, "src/feature.ts")),
      ).toEqual({
        level: "none",
        evidence: [],
        reminderText: null,
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given configured documentation roots When resolving doc identity Then matching paths return entity ids", () => {
    const tmpDir = makeWorkspace("kibi-links-doc-path-");
    try {
      const result = getFileLinkedEntityIds(
        tmpDir,
        path.join(tmpDir, ".kb", "events", "EVT-created.md"),
      );

      expect(result).toEqual({ ids: ["EVT-created"], source: "doc-path" });
      expect(
        getFileLinkedEntityIds(
          tmpDir,
          path.join(tmpDir, "documentation", "notes", "REQ-nope.md"),
        ),
      ).toEqual({ ids: [], source: "none" });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given symbols yaml entries When parsing relationships Then incomplete rows are ignored and targets are capped", () => {
    const rows = parseSymbolsYaml(
      [
        "symbols:",
        "  - id: SYM-missing-source",
        "    links:",
        "      - REQ-ignored",
        "  - id: SYM-complete",
        "    sourceFile: src/a.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-1",
      ].join("\n"),
    );

    expect(rows).toEqual([
      {
        id: "SYM-complete",
        sourceFile: "src/a.ts",
        links: [],
        relationships: [{ type: "implements", target: "REQ-1" }],
      },
    ]);
  });

  test("Given freshness evidence with an invalid runtime decision When evaluated Then exhaustive guard throws", () => {
    const evidence = JSON.parse(
      JSON.stringify({
        agentIdentity: "agent",
        worktree: "/repo",
        branch: "main",
        fingerprint: "fp",
        changedFiles: ["src/a.ts"],
        kbStatus: false,
        sourceLinkedDiscovery: false,
        kbMutation: false,
        kbCheck: false,
        decision: "surprise",
      }),
    );

    expect(() => evaluateKbFreshness(evidence)).toThrow("Unexpected decision");
  });

  test("Given freshness store records tools When reset Then evidence returns to defaults", () => {
    const store = createKbFreshnessEvidenceStore();
    const scope = {
      sessionId: "s1",
      agentIdentity: "agent",
      worktree: "/repo",
      branch: "main",
      fingerprint: "fp",
    };

    store.recordToolEvidence(scope, "kb_upsert");
    store.recordToolEvidence(scope, "kb_check");
    store.recordToolEvidence(scope, "not_a_kibi_tool");
    expect(store.getEvidence(scope, ["src/a.ts"]).decision).toBe("updated");

    store.resetScope(scope);

    expect(store.getEvidence(scope, ["src/a.ts"])).toEqual({
      sessionId: "s1",
      agentIdentity: "agent",
      worktree: "/repo",
      branch: "main",
      fingerprint: "fp",
      changedFiles: ["src/a.ts"],
      kbStatus: false,
      sourceLinkedDiscovery: false,
      kbMutation: false,
      kbCheck: false,
    });
  });

  test("Given logger transports reject When logging Then catch callbacks stay silent", async () => {
    const consoleErrors: string[] = [];
    logger._setConsoleError((...args) => {
      consoleErrors.push(args.map(String).join(" "));
    });
    logger.setClient({
      app: {
        log: async () => {
          throw new Error("log rejected");
        },
      },
    });

    logger.info("info rejected");
    logger.warn("warn rejected");
    logger.errorStructuredOnly("structured rejected");
    logger.error("operational rejected");
    await flushPromises();

    expect(consoleErrors).toEqual(["[kibi-opencode] operational rejected"]);
  });

  test("Given startup toast transports and logs reject When notifying Then all advisory catches are silent", async () => {
    const client = {
      tui: {
        toast: async () => {
          throw new Error("toast failed");
        },
      },
      app: {
        log: async () => {
          throw new Error("log failed");
        },
      },
    };

    notifyStartup(client, {
      versions: { opencode: "1.0.0" },
      directory: "/repo",
      versionMetadataSource: "generated-dist",
    });
    await flushPromises();

    expect(true).toBe(true);
  });

  test("Given remaining line-only branches When exercised Then small modules reach branch coverage", () => {
    const opState = createFileOperationState({
      worktree: "/repo",
      now: () => 10,
    });
    opState.recordLifecycle("src/a.ts", "created", 1);
    opState.recordLifecycle("src/a.ts", "created", 2);
    expect(
      opState.peekPending("/outside/a.ts")?.normalizedPath,
    ).toBeUndefined();
    expect(opState.peekPending()?.lifecycle).toBe("created");

    expect(
      buildDirtyRelevantFingerprint([" b ", null, "a", undefined, ""]),
    ).toBe(buildDirtyRelevantFingerprint(["a", "b"]));
    expect(
      classifyMeaningfulChange({
        normalizedPath: "notes/readme.md",
        pathKind: "unknown",
        lifecycle: "deleted",
      }),
    ).toBe("requires-kb-evidence");
    expect(
      computeEffectiveMode({
        mode: "hard",
        requireRootKbForStrict: true,
        posture: "root_partial",
        maintenanceDegraded: true,
      }),
    ).toBe("advisory");
  });

  test("Given version metadata has partial workspace data When dist is invalid Then missing packages are reported", () => {
    const baseUrl = new URL("file:///virtual/dist/index.js");
    const result = readKibiPackageVersions({
      baseUrl,
      readFileSync: (target) => {
        const rendered = String(target);
        if (rendered.endsWith("version-metadata.json")) return "{bad";
        if (rendered.includes("/virtual/package.json")) {
          return JSON.stringify({ version: 1 });
        }
        if (rendered.includes("/mcp/package.json")) {
          return JSON.stringify({ version: "2.0.0" });
        }
        throw new Error("missing");
      },
    });

    expect(result).toEqual({
      opencode: "unknown",
      mcp: "2.0.0",
      cli: "unknown",
      core: "unknown",
      source: "workspace-packages",
      missing: ["opencode", "cli", "core"],
    });
  });
});

describe("coverage completion for policy, prompt, and reconcile", () => {
  test("Given edited non-source and missing first event When computing policy Then fallback checkpoint branch is covered", () => {
    expect(
      computeEnforcementPolicy({
        effectiveMode: "advisory",
        lifecycleEvents: [{ normalizedPath: "README.md", lifecycle: "edited" }],
        pathKinds: ["requirement"],
        posture: "root_active",
      }),
    ).toMatchObject({
      kind: "advisory_guidance",
      text: "- Edited file detected. Review Kibi traceability for README.md before completing this task.",
    });

    expect(
      computeEnforcementPolicy({
        effectiveMode: "advisory",
        lifecycleEvents: [
          { normalizedPath: "ignored.bin", lifecycle: "created" },
        ],
        pathKinds: ["unknown"],
        posture: "root_active",
      }),
    ).toMatchObject({ kind: "checkpoint_passed", dirtyFileCount: 0 });
  });

  test("Given legacy prompt contexts When no risk class exists Then code, requirement, and KB doc fallbacks render", () => {
    expect(
      buildPrompt({
        recentEdits: [{ path: "src/a.ts", kind: "code" }],
        posture: "root_active",
        recentCommentSuggestion: {
          suggestionType: "scenario",
          filePath: "src/a.ts",
          confidence: "medium",
          sourceKind: "block-comment",
          reasoning: "flow",
          fingerprint: "scenario-fp",
        },
      }),
    ).toContain("Before implementing or explaining code");
    expect(
      buildPrompt({
        recentEdits: [{ path: "src/a.ts", kind: "code" }],
        posture: "root_active",
      }),
    ).toContain("Before implementing or explaining code");
    expect(
      buildPrompt({
        recentEdits: [
          { path: ".kb/requirements/REQ-1.md", kind: "requirement" },
        ],
        posture: "root_active",
      }),
    ).toContain("Requirement changes detected");
    expect(
      buildPrompt({
        recentEdits: [{ path: ".kb/facts/FACT-1.md", kind: "fact" }],
        posture: "root_active",
      }),
    ).toContain("Kibi documentation changes detected");
  });

  test("Given comment suggestions for fact and adr When building prompt Then specialized routing appears", () => {
    expect(
      buildPrompt({
        recentEdits: [{ path: "src/a.ts", kind: "code" }],
        posture: "root_active",
        riskClass: "behavior_candidate",
        recentCommentSuggestion: {
          suggestionType: "fact",
          filePath: "src/a.ts",
          confidence: "high",
          sourceKind: "block-comment",
          reasoning: "invariant",
          fingerprint: "fact-fp",
        },
      }),
    ).toContain("Durable knowledge detected: FACT");
    expect(
      buildPrompt({
        recentEdits: [{ path: "src/a.ts", kind: "code" }],
        posture: "root_active",
        riskClass: "behavior_candidate",
        recentCommentSuggestion: {
          suggestionType: "adr",
          filePath: "src/a.ts",
          confidence: "high",
          sourceKind: "block-comment",
          reasoning: "tradeoff",
          fingerprint: "adr-fp",
        },
      }),
    ).toContain("Durable knowledge detected: ADR");
  });

  test("Given nested payload values When reconciling Then normalization ignores timestamps and tracks relation ops", () => {
    const result = reconcileAuditEntries([
      {
        timestamp: "2026-01-01T00:00:03Z",
        operation: "upsert_rel",
        entityId: "REL-1",
      },
      {
        timestamp: "2026-01-01T00:00:01Z",
        operation: "upsert",
        entityId: "REQ-1",
        payload: {
          kind: "entity",
          entityType: "req",
          title: "  Title   One ",
          properties: {
            title: "Title One",
            nested: { b: " two  spaces ", a: [" x ", 1] },
            created_at: "ignored",
          },
        },
      },
    ]);

    expect(result.added).toEqual([
      { id: "REQ-1", type: "req", title: "  Title   One " },
    ]);
    expect(result.relationshipsChanged).toBe(1);
  });

  test("Given entity payload omits top-level fields When reconciling Then properties provide source and text refs", () => {
    expect(
      reconcileAuditEntries([
        {
          timestamp: "2026-01-01T00:00:01Z",
          operation: "upsert",
          entityId: "FACT-1",
          payload: {
            kind: "entity",
            entityType: "fact",
            changeKind: "updated",
            properties: {
              title: "Fact title",
              source: ".kb/facts/FACT-1.md",
              text_ref: ".kb/facts/FACT-1.md#L1",
            },
          },
        },
      ]).modified,
    ).toEqual([
      {
        id: "FACT-1",
        type: "fact",
        title: "Fact title",
        source: ".kb/facts/FACT-1.md",
        textRef: ".kb/facts/FACT-1.md#L1",
      },
    ]);
  });
});

describe("coverage completion for work context", () => {
  test("Given malformed linked git metadata When resolving context Then graceful fallbacks are used", () => {
    const tmpDir = makeTempDir("kibi-work-context-more-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".git"), "not-a-gitdir\n");
      const context = resolveWorkContext({
        inputDirectory: tmpDir,
        inputWorktree: tmpDir,
        filePath: "src/missing.ts",
      });

      expect(context.branch).toBe("unknown");
      expect(context.repoRelativePath).toBe("src/missing.ts");
      expect(context.isLinkedWorktree).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given relative linked git metadata When resolving context Then relative gitdir and ref branches are handled", () => {
    const authorityDir = makeWorkspace("kibi-work-context-authority-");
    const linkedDir = makeTempDir("kibi-work-context-relative-");
    try {
      const relativeGitDir = path.join(
        "..",
        path.basename(authorityDir),
        ".git",
        "worktrees",
        "relative",
      );
      const gitDir = path.resolve(linkedDir, relativeGitDir);
      fs.mkdirSync(gitDir, { recursive: true });
      fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/tags/v1\n");
      fs.writeFileSync(
        path.join(linkedDir, ".git"),
        `gitdir: ${relativeGitDir}\n`,
      );

      const context = resolveWorkContext({
        inputDirectory: authorityDir,
        inputWorktree: linkedDir,
      });

      expect(context.branch).toBe("HEAD");
      expect(context.isLinkedWorktree).toBe(true);
    } finally {
      fs.rmSync(authorityDir, { recursive: true, force: true });
      fs.rmSync(linkedDir, { recursive: true, force: true });
    }
  });

  test("Given linked gitdir with empty commondir and detached head When resolving context Then linked root is reported", () => {
    const mainDir = makeWorkspace("kibi-work-context-main-");
    const linkedDir = makeTempDir("kibi-work-context-linked-");
    try {
      const gitDir = path.join(mainDir, ".git", "worktrees", "linked");
      fs.mkdirSync(gitDir, { recursive: true });
      fs.writeFileSync(path.join(gitDir, "HEAD"), "abc123\n");
      fs.writeFileSync(path.join(gitDir, "commondir"), "\n");
      fs.writeFileSync(path.join(linkedDir, ".git"), `gitdir: ${gitDir}\n`);

      const context = resolveWorkContext({
        inputDirectory: mainDir,
        inputWorktree: linkedDir,
      });

      expect(context.branch).toBe("HEAD");
      expect(context.isLinkedWorktree).toBe(true);
      expect(context.kibiAuthorityRoot).toBe(mainDir);
    } finally {
      fs.rmSync(mainDir, { recursive: true, force: true });
      fs.rmSync(linkedDir, { recursive: true, force: true });
    }
  });
});

describe("coverage completion for plugin lifecycle", () => {
  test("Given client with SDK toast helpers When plugin starts Then capability mapping delivers startup toast", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-client-mapping-");
    const captured = makeClient();
    const autoUpdateInputs: Array<{ directory: string; enabled: boolean }> = [];
    globals.__kibi_test_schedule_startup_notify = (callback) => callback();
    globals.__kibi_test_auto_update_runner = async (input) => {
      autoUpdateInputs.push(input);
      return { status: "up-to-date" };
    };
    try {
      await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });
      await flushPromises();

      expect(
        captured.toasts.some((toast) =>
          toast.message.includes("kibi-opencode started"),
        ),
      ).toBe(true);
      expect(autoUpdateInputs).toEqual([{ directory: tmpDir, enabled: true }]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given KB tool events When plugin observes them Then freshness evidence changes later prompt guidance", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-tool-events-");
    const captured = makeClient();
    globals.__kibi_test_schedule_startup_notify = () => {};
    try {
      const sourcePath = path.join(tmpDir, "src", "feature.ts");
      fs.writeFileSync(sourcePath, "export function feature() { return 1; }\n");
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        sessionId: "session-1",
        agentIdentity: "agent",
        client: captured.client,
      });

      await hooks.event?.({
        event: {
          type: "tool.execute.after",
          properties: { tool: "kb_search" },
        },
      });
      await hooks.event?.({
        event: {
          type: "tool.call.completed",
          properties: { call: { name: "kb_upsert" } },
        },
      });
      fs.writeFileSync(sourcePath, "export function feature() { return 2; }\n");
      await hooks.event?.({
        event: { type: "file.edited", properties: { file: "src/feature.ts" } },
      });
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.(
        { focusFilePath: "src/feature.ts" },
        output,
      );

      expect(logMessages(captured.logs)).toContain(
        "kb-freshness.tool-evidence",
      );
      expect(output.system.join("\n")).toContain("Kibi freshness required");
      expect(output.system.join("\n")).toContain("Missing: kbCheck");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given scheduler factory callbacks When sync failures occur Then runtime degraded guidance is emitted", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-runtime-degraded-");
    const captured = makeClient();
    const scheduled: ScheduledSync[] = [];
    globals.__kibi_test_schedule_startup_notify = () => {};
    writePluginConfig(tmpDir, {
      guidance: { smartEnforcement: { mode: "strict" } },
    });
    globals.__kibi_test_scheduler_factory = (options) => ({
      scheduleSync: (reason, filePath, checkRules) => {
        scheduled.push({
          reason,
          ...(filePath !== undefined ? { filePath } : {}),
          ...(checkRules !== undefined ? { checkRules } : {}),
        });
        if (checkRules !== undefined) {
          options.onRunComplete?.({
            reason,
            worktree: tmpDir,
            debounceWindowMs: 0,
            durationMs: 0,
            exitCode: 1,
            checkExitCode: 1,
          });
        }
      },
      onFileEdited: () => {},
      onToolExecuteAfter: () => {},
      flush: async () => {},
      dispose: () => {},
    });
    try {
      const reqPath = path.join(tmpDir, ".kb", "requirements", "REQ-must.md");
      fs.writeFileSync(reqPath, "---\npriority: must\n---\nRequirement\n");
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });

      await hooks.event?.({
        event: {
          type: "file.edited",
          properties: { file: ".kb/requirements/REQ-must.md" },
        },
      });
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.(
        { focusFilePath: ".kb/requirements/REQ-must.md" },
        output,
      );

      expect(
        scheduled.some((entry) =>
          entry.checkRules?.includes("must-priority-coverage"),
        ),
      ).toBe(true);
      expect(output.system.join("\n")).toContain("Maintenance degraded");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given hard mode file creation When prompt transforms Then hard gate is requested and consumed", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-hard-gate-");
    const captured = makeClient();
    installSchedulerStub([]);
    globals.__kibi_test_schedule_startup_notify = () => {};
    writePluginConfig(tmpDir, {
      guidance: { smartEnforcement: { mode: "hard" } },
    });
    try {
      fs.writeFileSync(
        path.join(tmpDir, "src", "new-feature.ts"),
        "export const value = 1;\n",
      );
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });

      await hooks.event?.({
        event: {
          type: "file.created",
          properties: { file: "src/new-feature.ts" },
        },
      });
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.(
        { focusFilePath: "src/new-feature.ts" },
        output,
      );
      await flushPromises();

      expect(output.system.join("\n")).toContain("Kibi hard gate blocked");
      expect(logMessages(captured.logs)).toContain(
        "smart-enforcement.hard-gate-consumed",
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given prompt hooks in chat-params mode When invoked Then no-op hook logs activity", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-chat-params-");
    const captured = makeClient();
    globals.__kibi_test_schedule_startup_notify = () => {};
    writePluginConfig(tmpDir, { prompt: { hookMode: "chat-params" } });
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });

      await hooks["chat.params"]?.({}, {});

      expect(hooks["experimental.chat.system.transform"]).toBeUndefined();
      expect(logMessages(captured.logs)).not.toContain(
        "prompt injection via system.transform",
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given existing sentinel and empty transform input When transforming Then duplicate guidance is skipped", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-sentinel-");
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });
      const output = { system: ["already <!-- kibi-opencode -->"] };

      await hooks["experimental.chat.system.transform"]?.(null, output);

      expect(output.system).toEqual(["already <!-- kibi-opencode -->"]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given auto hook mode When chat params runs Then compatibility activity is logged", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-auto-chat-params-");
    const captured = makeClient();
    globals.__kibi_test_schedule_startup_notify = () => {};
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });

      await hooks["chat.params"]?.({}, {});

      expect(logMessages(captured.logs)).toContain(
        "kibi-opencode: chat.params hook active (prompt injection via system.transform)",
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given null transform input without sentinel When transforming Then focus detection falls back safely", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-null-transform-");
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });
      const output = { system: [] as string[] };

      await hooks["experimental.chat.system.transform"]?.(null, output);

      expect(output.system.join("\n")).toContain("<!-- kibi-opencode -->");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given scoped worktree file events When scheduler factory is per-worktree Then scoped scheduler is created", async () => {
    const rootDir = makeWorkspace("kibi-plugin-root-scheduler-");
    const otherDir = makeWorkspace("kibi-plugin-other-scheduler-");
    const scheduled: ScheduledSync[] = [];
    globals.__kibi_test_scheduler_factory_by_worktree = new Map([
      [
        path.resolve(otherDir),
        () => ({
          scheduleSync: (reason, filePath, checkRules) => {
            scheduled.push({
              reason,
              ...(filePath !== undefined ? { filePath } : {}),
              ...(checkRules !== undefined ? { checkRules } : {}),
            });
          },
          onFileEdited: () => {},
          onToolExecuteAfter: () => {},
          flush: async () => {},
          dispose: () => {},
        }),
      ],
    ]);
    try {
      fs.mkdirSync(path.join(otherDir, ".git"), { recursive: true });
      fs.writeFileSync(
        path.join(otherDir, ".git", "HEAD"),
        "ref: refs/heads/feature\n",
      );
      const otherFile = path.join(otherDir, "src", "scoped.ts");
      fs.writeFileSync(otherFile, "export const scoped = true;\n");
      const hooks = await kibiOpencodePlugin({
        directory: rootDir,
        worktree: rootDir,
      });

      await hooks.event?.({
        event: { type: "file.edited", properties: { file: otherFile } },
      });

      expect(
        scheduled.some((entry) => entry.filePath === "src/scoped.ts"),
      ).toBe(true);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(otherDir, { recursive: true, force: true });
    }
  });

  test("Given scoped scheduler factory throws When file event arrives Then plugin degrades without throwing", async () => {
    const rootDir = makeWorkspace("kibi-plugin-root-scheduler-throw-");
    const otherDir = makeWorkspace("kibi-plugin-other-scheduler-throw-");
    globals.__kibi_test_scheduler_factory_by_worktree = new Map([
      [
        path.resolve(otherDir),
        () => {
          throw new Error("factory unavailable");
        },
      ],
    ]);
    try {
      const otherFile = path.join(otherDir, "src", "scoped.ts");
      fs.writeFileSync(otherFile, "export const scoped = true;\n");
      const hooks = await kibiOpencodePlugin({
        directory: rootDir,
        worktree: rootDir,
      });

      await hooks.event?.({
        event: { type: "file.edited", properties: { file: otherFile } },
      });

      expect(true).toBe(true);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(otherDir, { recursive: true, force: true });
    }
  });

  test("Given repeated risk context When guidance cache is satisfied Then event processing logs cache hit", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-cache-hit-");
    const captured = makeClient();
    installSchedulerStub([]);
    globals.__kibi_test_schedule_startup_notify = () => {};
    try {
      const sourcePath = path.join(tmpDir, "src", "cached.ts");
      fs.writeFileSync(sourcePath, "export function cached() { return 1; }\n");
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });
      await hooks.event?.({
        event: { type: "file.edited", properties: { file: "src/cached.ts" } },
      });
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.(
        { focusFilePath: "src/cached.ts" },
        output,
      );
      await hooks.event?.({
        event: { type: "file.edited", properties: { file: "src/cached.ts" } },
      });
      await flushPromises();

      expect(
        captured.logs.some((payload) => {
          const body = payload.body;
          return (
            body !== null &&
            typeof body === "object" &&
            "event" in body &&
            body.event === "smart_enforcement_cache"
          );
        }),
      ).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given fact document edit When targeted checks run Then strict fact rules are scheduled", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-fact-targeted-");
    const scheduled: ScheduledSync[] = [];
    installSchedulerStub(scheduled);
    try {
      const factPath = path.join(tmpDir, ".kb", "facts", "FACT-1.md");
      fs.writeFileSync(factPath, "---\ntitle: Fact\n---\nFact body\n");
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });

      await hooks.event?.({
        event: {
          type: "file.edited",
          properties: { file: ".kb/facts/FACT-1.md" },
        },
      });

      expect(
        scheduled.some((entry) =>
          entry.checkRules?.includes("strict-fact-shape"),
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given source file with e2e-linked test When prompt renders Then e2e reminder is marked shown", async () => {
    const tmpDir = makeWorkspace("kibi-plugin-e2e-reminder-");
    try {
      fs.writeFileSync(
        path.join(tmpDir, ".kb", "symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-e2e",
          "    sourceFile: src/e2e.ts",
          "    relationships:",
          "      - type: covered_by",
          "        target: TEST-e2e",
        ].join("\n"),
      );
      fs.writeFileSync(
        path.join(tmpDir, ".kb", "tests", "TEST-e2e.md"),
        [
          "---",
          "title: E2E",
          "tags:",
          "  - e2e",
          "---",
          "covers src/e2e.ts",
        ].join("\n"),
      );
      fs.writeFileSync(
        path.join(tmpDir, "src", "e2e.ts"),
        "export const e2e = true;\n",
      );
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });
      await hooks.event?.({
        event: { type: "file.created", properties: { file: "src/e2e.ts" } },
      });
      const output = { system: [] as string[] };

      await hooks["experimental.chat.system.transform"]?.(
        { focusFilePath: "src/e2e.ts" },
        output,
      );

      expect(output.system.join("\n")).toContain("existing e2e coverage");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
