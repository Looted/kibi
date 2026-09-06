import { afterEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createAutoUpdateRunner,
  findKibiOpencodePluginEntry,
} from "../src/auto-update.js";
import { computeEnforcementPolicy } from "../src/enforcement-policy.js";
import {
  detectKibiBootstrapCommandCapability,
  registerKibiBootstrapCommand,
} from "../src/kibi-bootstrap-capability.js";
import { resolveWorkContext } from "../src/work-context-resolver.js";
import type { WorkContext } from "../src/work-context-resolver.js";

type PlatformValue = NodeJS.Platform;

const originalPlatform = process.platform;
const originalXdgCacheHome = process.env.XDG_CACHE_HOME;

function restoreEnv(): void {
  Object.defineProperty(process, "platform", { value: originalPlatform });
  if (originalXdgCacheHome === undefined) {
    Reflect.deleteProperty(process.env, "XDG_CACHE_HOME");
  } else {
    process.env.XDG_CACHE_HOME = originalXdgCacheHome;
  }
}

afterEach(() => {
  mock.restore();
  restoreEnv();
});

function withPlatform(platform: PlatformValue): void {
  Object.defineProperty(process, "platform", { value: platform });
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeProjectWithPlugins(plugins: readonly string[]): string {
  const tmpDir = makeTempDir("kibi-final-auto-update-");
  fs.writeFileSync(
    path.join(tmpDir, "opencode.json"),
    JSON.stringify({ plugin: plugins }),
  );
  return tmpDir;
}

describe("coverage final gaps for auto-update", () => {
  test("Given unsupported file plugin entry When detecting plugin Then file URL without package name is ignored", () => {
    const tmpDir = makeProjectWithPlugins(["file:///tmp/other-plugin"]);
    try {
      expect(findKibiOpencodePluginEntry(tmpDir)).toBeNull();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given prerelease edge versions When comparing through runner Then all prerelease equality and length branches are covered", async () => {
    const tmpDir = makeProjectWithPlugins(["kibi-opencode"]);
    const cases = [
      ["1.0.0-alpha.beta", "1.0.0-alpha.1"],
      ["1.0.0-alpha.1", "1.0.0-alpha"],
      ["1.0.0", "1.0.0-alpha"],
      ["1.0.0-alpha.1", "1.0.0-alpha.1"],
      ["1.0.1", "1.0.0"],
    ] as const;
    try {
      for (const [currentVersion, latestVersion] of cases) {
        const runner = createAutoUpdateRunner({
          getCurrentVersion: () => currentVersion,
          getLatestVersion: async () => latestVersion,
          invalidatePackage: () => true,
          runInstall: async () => true,
          notify: async () => {},
          log: () => {},
        });

        expect(
          (await runner({ directory: tmpDir, enabled: true })).status,
        ).toBe("up-to-date");
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("Given cached package in cache root When running install Then cache root is selected as active workspace", async () => {
    const cacheHome = makeTempDir("kibi-final-install-cache-");
    const execCalls: Array<{
      readonly command: string;
      readonly args: readonly string[];
      readonly cwd: string;
    }> = [];
    try {
      process.env.XDG_CACHE_HOME = cacheHome;
      const cachePackageJson = path.join(
        cacheHome,
        "opencode",
        "node_modules",
        "kibi-opencode",
        "package.json",
      );
      fs.mkdirSync(path.dirname(cachePackageJson), { recursive: true });
      fs.writeFileSync(cachePackageJson, JSON.stringify({ version: "1.0.0" }));
      mock.module("node:child_process", () => ({
        execFile: (
          command: string,
          args: string[],
          options: { readonly cwd: string },
          callback: (error: Error | null) => void,
        ) => {
          execCalls.push({ command, args, cwd: options.cwd });
          callback(null);
        },
      }));
      const freshAutoUpdate = await import(
        new URL("../src/auto-update.ts?cache-root-install", import.meta.url)
          .href
      );

      expect(await freshAutoUpdate.runBunInstallForOpenCodePlugin()).toBe(true);
      expect(execCalls[0]?.cwd).toBe(path.join(cacheHome, "opencode"));
    } finally {
      fs.rmSync(cacheHome, { recursive: true, force: true });
    }
  });

  test("Given no cached package When running install Then packages cache is selected as fallback workspace", async () => {
    const cacheHome = makeTempDir("kibi-final-install-packages-");
    const execCalls: Array<{ readonly cwd: string }> = [];
    try {
      process.env.XDG_CACHE_HOME = cacheHome;
      mock.module("node:child_process", () => ({
        execFile: (
          _command: string,
          _args: string[],
          options: { readonly cwd: string },
          callback: (error: Error | null) => void,
        ) => {
          execCalls.push({ cwd: options.cwd });
          callback(new Error("install failed"));
        },
      }));
      const freshAutoUpdate = await import(
        new URL("../src/auto-update.ts?packages-cache-install", import.meta.url)
          .href
      );

      expect(await freshAutoUpdate.runBunInstallForOpenCodePlugin()).toBe(
        false,
      );
      expect(execCalls[0]?.cwd).toBe(
        path.join(cacheHome, "opencode", "packages"),
      );
    } finally {
      fs.rmSync(cacheHome, { recursive: true, force: true });
    }
  });

  test("Given Windows cache defaults When running install Then local app data workspace is selected", async () => {
    const tmpDir = makeTempDir("kibi-final-install-win-");
    const execCalls: Array<{ readonly cwd: string }> = [];
    try {
      withPlatform("win32");
      process.env.LOCALAPPDATA = path.join(tmpDir, "LocalAppData");
      mock.module("node:child_process", () => ({
        execFile: (
          _command: string,
          _args: string[],
          options: { readonly cwd: string },
          callback: (error: Error | null) => void,
        ) => {
          execCalls.push({ cwd: options.cwd });
          callback(null);
        },
      }));
      const freshAutoUpdate = await import(
        new URL("../src/auto-update.ts?win-install", import.meta.url).href
      );

      expect(await freshAutoUpdate.runBunInstallForOpenCodePlugin()).toBe(true);
      expect(execCalls[0]?.cwd).toBe(
        path.join(tmpDir, "LocalAppData", "opencode", "packages"),
      );
    } finally {
      Reflect.deleteProperty(process.env, "LOCALAPPDATA");
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("coverage final gaps for kibi-bootstrap capability", () => {
  test("Given missing host hooks and sdk command fields When detecting capability Then each unsupported path is returned", () => {
    expect(detectKibiBootstrapCommandCapability({})).toEqual({
      supported: false,
      reason:
        "@opencode-ai/plugin host Hooks definition is unavailable for config hook inspection.",
    });
    expect(
      detectKibiBootstrapCommandCapability({
        pluginHooksDts:
          "export interface Hooks { config?: (input: Config) => Promise<void>; }",
        sdkTypesDts:
          "export interface Config { command?: Record<string, string>; }",
      }),
    ).toEqual({
      supported: false,
      reason:
        "@opencode-ai/plugin SDK Config type does not expose the command field needed for native command injection.",
    });
  });

  test("Given existing command map When registering init command Then existing command is preserved", () => {
    const configInput: {
      command: Record<
        string,
        { readonly template: string; readonly description?: string }
      >;
    } = { command: { existing: { template: "keep", description: "Keep" } } };

    const capability = registerKibiBootstrapCommand(configInput, {
      supported: true,
      pluginVersion: "unknown",
    });

    expect(capability).toEqual({ supported: true, pluginVersion: "unknown" });
    expect(configInput.command.existing).toEqual({
      template: "keep",
      description: "Keep",
    });
    expect(configInput.command["kibi-bootstrap"]?.template).toContain(
      "canonical `kibi-bootstrap` skill",
    );
  });
});

describe("coverage final gaps for policy and work context", () => {
  test("Given no relevant lifecycle events When advisory policy runs Then checkpoint-passed no-op is returned", () => {
    const result = computeEnforcementPolicy({
      posture: "root_active",
      effectiveMode: "advisory",
      resolvedContext: {
        worktreeRoot: "/repo",
        kibiAuthorityRoot: "/repo",
        branch: "main",
        repoRelativePath: ".",
        isLinkedWorktree: false,
        isAuthoritative: true,
        posture: "root_active",
        sessionId: "session",
        agentIdentity: "agent",
      } satisfies WorkContext,
      lifecycleEvents: [],
      pathKinds: [],
      linkedEntityResults: [],
      e2eSignals: [],
      checkpointEvidence: false,
    });

    expect(result.kind).toBe("checkpoint_passed");
    expect(result.dirtyFileCount).toBe(0);
  });

  test("Given only ignored advisory events When policy runs Then checkpoint-passed is returned after filtering", () => {
    const result = computeEnforcementPolicy({
      posture: "root_active",
      effectiveMode: "advisory",
      resolvedContext: {
        worktreeRoot: "/repo",
        kibiAuthorityRoot: "/repo",
        branch: "main",
        repoRelativePath: ".",
        isLinkedWorktree: false,
        isAuthoritative: true,
        posture: "root_active",
        sessionId: "session",
        agentIdentity: "agent",
      } satisfies WorkContext,
      lifecycleEvents: [
        { normalizedPath: "dist/out.bin", lifecycle: "created" },
        { normalizedPath: "tmp/cache", lifecycle: "edited" },
      ],
      pathKinds: ["ignored", "unknown"] as never,
      linkedEntityResults: [],
      e2eSignals: [],
      checkpointEvidence: false,
    });

    expect(result.kind).toBe("checkpoint_passed");
    expect(result.dirtyFileCount).toBe(0);
    expect(result.text).toBeNull();
  });

  test("Given empty linked gitdir file When resolving context Then non-git fallback context is returned", () => {
    const tmpDir = makeTempDir("kibi-final-work-context-empty-gitdir-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".git"), "gitdir:   \n");

      const context = resolveWorkContext({
        inputDirectory: tmpDir,
        inputWorktree: tmpDir,
      });

      expect(context.isAuthoritative).toBe(false);
      expect(context.branch).toBe("unknown");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
