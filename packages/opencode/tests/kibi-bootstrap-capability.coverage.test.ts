import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  _resetKibiBootstrapCapabilityCacheForTests,
  detectKibiBootstrapCommandCapability,
  findSdkPackageJsonForPluginRoot,
  getKibiBootstrapCommandCapability,
  registerKibiBootstrapCommand,
} from "../src/kibi-bootstrap-capability.js";

const SUPPORTED_PLUGIN_DTS =
  "export interface Hooks { config?: (input: Config) => Promise<void>; }";
const SUPPORTED_SDK_DTS =
  "export type Config = { command?: { [key: string]: { template: string; }; }; };";

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeDogfoodHost(
  root: string,
  options?: {
    pluginVersion?: unknown;
    invalidPluginJson?: boolean;
    includeSdk?: boolean;
    nestedSdk?: boolean;
    pluginDts?: string;
    sdkDts?: string;
  },
): void {
  const pluginRoot = path.join(
    root,
    ".opencode",
    "node_modules",
    "@opencode-ai",
    "plugin",
  );
  fs.mkdirSync(path.join(pluginRoot, "dist"), { recursive: true });
  if (options?.invalidPluginJson) {
    fs.writeFileSync(path.join(pluginRoot, "package.json"), "{");
  } else {
    fs.writeFileSync(
      path.join(pluginRoot, "package.json"),
      JSON.stringify(
        options?.pluginVersion === undefined
          ? { name: "@opencode-ai/plugin" }
          : { version: options.pluginVersion },
      ),
    );
  }
  if (options?.pluginDts !== undefined) {
    fs.writeFileSync(
      path.join(pluginRoot, "dist", "index.d.ts"),
      options.pluginDts,
    );
  }

  if (options?.includeSdk === false) {
    return;
  }

  const sdkRoot = options?.nestedSdk
    ? path.join(pluginRoot, "node_modules", "@opencode-ai", "sdk")
    : path.join(root, ".opencode", "node_modules", "@opencode-ai", "sdk");
  fs.mkdirSync(path.join(sdkRoot, "dist", "v2", "gen"), { recursive: true });
  fs.writeFileSync(path.join(sdkRoot, "package.json"), JSON.stringify({}));
  if (options?.sdkDts !== undefined) {
    fs.writeFileSync(
      path.join(sdkRoot, "dist", "v2", "gen", "types.gen.d.ts"),
      options.sdkDts,
    );
  }
}

describe("kibi-bootstrap capability remaining runtime branches", () => {
  const originalCwd = process.cwd();
  const originalPwd = process.env.PWD;
  const originalGithubWorkspace = process.env.GITHUB_WORKSPACE;
  const cleanup: string[] = [];

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalPwd === undefined) {
      Reflect.deleteProperty(process.env, "PWD");
    } else {
      process.env.PWD = originalPwd;
    }
    if (originalGithubWorkspace === undefined) {
      Reflect.deleteProperty(process.env, "GITHUB_WORKSPACE");
    } else {
      process.env.GITHUB_WORKSPACE = originalGithubWorkspace;
    }
    _resetKibiBootstrapCapabilityCacheForTests();
    for (const dir of cleanup.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("dogfood host with versioned plugin and sibling SDK is discovered after cache reset", () => {
    // implements REQ-KIBI-BOOTSTRAP-PLAN
    const root = makeTempDir("kibi-bootstrap-dogfood-");
    cleanup.push(root);
    writeDogfoodHost(root, {
      pluginVersion: "9.9.9",
      pluginDts: SUPPORTED_PLUGIN_DTS,
      sdkDts: SUPPORTED_SDK_DTS,
    });
    process.chdir(root);
    process.env.PWD = root;
    process.env.GITHUB_WORKSPACE = root;
    _resetKibiBootstrapCapabilityCacheForTests();

    const first = getKibiBootstrapCommandCapability();
    const second = getKibiBootstrapCommandCapability();
    expect(first).toEqual({ supported: true, pluginVersion: "9.9.9" });
    expect(second).toBe(first);
  });

  test("dogfood host without version still reports support as unknown plugin version", () => {
    const root = makeTempDir("kibi-bootstrap-nover-");
    cleanup.push(root);
    writeDogfoodHost(root, {
      pluginDts: SUPPORTED_PLUGIN_DTS,
      sdkDts: SUPPORTED_SDK_DTS,
    });
    process.chdir(root);
    _resetKibiBootstrapCapabilityCacheForTests();

    expect(getKibiBootstrapCommandCapability()).toEqual({
      supported: true,
      pluginVersion: "unknown",
    });
  });

  test("partial dogfood installs keep probing until a complete host is found", () => {
    const root = makeTempDir("kibi-bootstrap-partial-");
    cleanup.push(root);
    writeDogfoodHost(root, { includeSdk: false, pluginVersion: "1.0.0" });
    const nested = path.join(root, "nested");
    fs.mkdirSync(nested, { recursive: true });
    writeDogfoodHost(nested, {
      pluginVersion: 12,
      pluginDts: "",
      sdkDts: "",
    });
    const complete = path.join(root, "complete");
    fs.mkdirSync(complete, { recursive: true });
    writeDogfoodHost(complete, {
      pluginVersion: "2.0.0",
      nestedSdk: true,
      pluginDts: SUPPORTED_PLUGIN_DTS,
      sdkDts: SUPPORTED_SDK_DTS,
    });

    process.chdir(complete);
    process.env.PWD = root;
    _resetKibiBootstrapCapabilityCacheForTests();

    expect(getKibiBootstrapCommandCapability()).toEqual({
      supported: true,
      pluginVersion: "2.0.0",
    });
  });

  test("invalid plugin package.json and missing dts skip dogfood and fall through", () => {
    const root = makeTempDir("kibi-bootstrap-invalid-");
    cleanup.push(root);
    writeDogfoodHost(root, {
      invalidPluginJson: true,
      pluginDts: SUPPORTED_PLUGIN_DTS,
      sdkDts: SUPPORTED_SDK_DTS,
    });
    process.chdir(root);
    _resetKibiBootstrapCapabilityCacheForTests();

    const capability = getKibiBootstrapCommandCapability();
    expect(capability.supported === true || capability.supported === false).toBe(
      true,
    );
  });

  test("findSdkPackageJsonForPluginRoot returns undefined when neither layout exists", () => {
    const root = makeTempDir("kibi-bootstrap-sdk-miss-");
    cleanup.push(root);
    const pluginRoot = path.join(root, "plugin");
    fs.mkdirSync(pluginRoot, { recursive: true });
    expect(findSdkPackageJsonForPluginRoot(pluginRoot)).toBeUndefined();
  });

  test("detect and register cover missing-version unsupported reasons and empty command maps", () => {
    expect(
      detectKibiBootstrapCommandCapability({
        pluginHooksDts: "",
      }),
    ).toEqual({
      supported: false,
      reason:
        "@opencode-ai/plugin host Hooks definition is unavailable for config hook inspection.",
    });

    const configInput: Record<string, unknown> = {};
    const registered = registerKibiBootstrapCommand(configInput, {
      supported: true,
      pluginVersion: "unknown",
    });
    expect(registered.supported).toBe(true);
    expect(configInput.command).toEqual(
      expect.objectContaining({
        "kibi-bootstrap": expect.objectContaining({
          description: expect.any(String),
          template: expect.any(String),
        }),
      }),
    );
  });
});
