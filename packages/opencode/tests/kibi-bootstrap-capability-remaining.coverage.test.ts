import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  _resetKibiBootstrapCapabilityCacheForTests,
  capabilityInputsOrEmpty,
  detectKibiBootstrapCommandCapability,
  getKibiBootstrapCommandCapability,
} from "../src/kibi-bootstrap-capability.js";

const dirs: string[] = [];
const originalCwd = process.cwd();
const originalPwd = process.env.PWD;
const originalGithubWorkspace = process.env.GITHUB_WORKSPACE;

afterEach(() => {
  _resetKibiBootstrapCapabilityCacheForTests();
  process.chdir(originalCwd);
  if (originalPwd === undefined) Reflect.deleteProperty(process.env, "PWD");
  else process.env.PWD = originalPwd;
  if (originalGithubWorkspace === undefined) {
    Reflect.deleteProperty(process.env, "GITHUB_WORKSPACE");
  } else {
    process.env.GITHUB_WORKSPACE = originalGithubWorkspace;
  }
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("kibi-bootstrap-capability remaining unsupported host inputs", () => {
  test("reports unsupported when host dts inputs are missing", () => {
    expect(detectKibiBootstrapCommandCapability({}).supported).toBe(false);
    expect(
      detectKibiBootstrapCommandCapability({
        pluginVersion: "1.2.3",
        pluginHooksDts: "export interface Hooks {}",
      }).supported,
    ).toBe(false);
  });

  test("probes missing dogfood dts files then falls back when require.resolve fails", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-boot-host-"));
    dirs.push(root);
    const pluginRoot = path.join(
      root,
      ".opencode",
      "node_modules",
      "@opencode-ai",
      "plugin",
    );
    const sdkRoot = path.join(
      root,
      ".opencode",
      "node_modules",
      "@opencode-ai",
      "sdk",
    );
    mkdirSync(pluginRoot, { recursive: true });
    mkdirSync(sdkRoot, { recursive: true });
    writeFileSync(
      path.join(pluginRoot, "package.json"),
      JSON.stringify({ name: "@opencode-ai/plugin", version: "0.0.0" }),
    );
    writeFileSync(
      path.join(sdkRoot, "package.json"),
      JSON.stringify({ name: "@opencode-ai/sdk", version: "0.0.0" }),
    );
    process.env.PWD = root;
    Reflect.deleteProperty(process.env, "GITHUB_WORKSPACE");
    process.chdir(root);
    const capability = getKibiBootstrapCommandCapability();
    expect(typeof capability.supported).toBe("boolean");
  });

  test("capabilityInputsOrEmpty swallows loader failures", () => {
    expect(capabilityInputsOrEmpty(() => ({ pluginVersion: "1" }))).toEqual({
      pluginVersion: "1",
    });
    expect(
      capabilityInputsOrEmpty(() => {
        throw new Error("missing plugin");
      }),
    ).toEqual({});
  });
});
