import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import kibiOpencodePlugin from "../src/index";
import { buildKibiBootstrapAlias } from "../src/kibi-bootstrap-alias";
import {
  KIBI_BOOTSTRAP_COMMAND_DESCRIPTION,
  KIBI_BOOTSTRAP_COMMAND_NAME,
  KIBI_BOOTSTRAP_COMMAND_TEMPLATE,
  type KibiBootstrapCommandCapability,
  type OpenCodeConfigHookInput,
  detectKibiBootstrapCommandCapability,
  findSdkPackageJsonForPluginRoot,
  getKibiBootstrapCommandCapability,
  registerKibiBootstrapCommand,
} from "../src/kibi-bootstrap-capability";
import { buildPrompt } from "../src/prompt";

const SUPPORTED_PLUGIN_DTS = `
export interface Hooks {
  event?: (input: { event: Event }) => Promise<void>;
  config?: (input: Config) => Promise<void>;
}
`;

const SUPPORTED_SDK_DTS = `
export type Config = {
  command?: {
    [key: string]: {
      template: string;
      description?: string;
      agent?: string;
      model?: string;
      subtask?: boolean;
    };
  };
};
`;

function buildPromptWithCapability(
  capability: KibiBootstrapCommandCapability,
): string {
  return buildPrompt(undefined, capability);
}

describe("kibi-bootstrap native command support", () => {
  let tmpBase: string;
  let homedirSpy: ReturnType<typeof spyOn>;

  beforeAll(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-kibi-bootstrap-command-"));
    homedirSpy = spyOn(os, "homedir").mockReturnValue(tmpBase);
  });

  afterAll(() => {
    homedirSpy.mockRestore();
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  function makeProjectDir(): string {
    const dir = fs.mkdtempSync(path.join(tmpBase, "proj-"));
    fs.mkdirSync(path.join(dir, ".opencode"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".opencode", "kibi.json"),
      JSON.stringify({
        prompt: { hookMode: "auto" },
        sync: { enabled: false },
      }),
    );
    return dir;
  }

  test("supports native kibi-bootstrap injection", async () => {
    const capability = getKibiBootstrapCommandCapability();

    expect(capability.supported).toBe(true);

    const dir = makeProjectDir();
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
    const configHook = hooks.config;

    assert.ok(configHook, "supported hosts should expose a config hook");

    const configInput: OpenCodeConfigHookInput = {
      command: {
        existing: {
          template: "Existing command",
        },
      },
    };

    await configHook(configInput);

    assert.ok(
      configInput.command,
      "config hook should populate config.command",
    );
    expect(configInput.command.existing.template).toBe("Existing command");
    expect(configInput.command[KIBI_BOOTSTRAP_COMMAND_NAME]?.description).toBe(
      KIBI_BOOTSTRAP_COMMAND_DESCRIPTION,
    );
    expect(configInput.command[KIBI_BOOTSTRAP_COMMAND_NAME]?.template).toBe(
      KIBI_BOOTSTRAP_COMMAND_TEMPLATE,
    );
  });

  test("hard-stops when native injection unsupported", () => {
    const missingConfigHook = detectKibiBootstrapCommandCapability({
      pluginVersion: "1.2.25",
      pluginHooksDts: "export interface Hooks { event?: () => Promise<void>; }",
      sdkTypesDts: SUPPORTED_SDK_DTS,
    });
    const missingCommandField = detectKibiBootstrapCommandCapability({
      pluginVersion: "1.2.26",
      pluginHooksDts: SUPPORTED_PLUGIN_DTS,
      sdkTypesDts: "export type Config = { plugin?: string[]; };",
    });
    const configInput: OpenCodeConfigHookInput = {
      command: {
        existing: {
          template: "Existing command",
        },
      },
    };

    expect(missingConfigHook.supported).toBe(false);
    if (missingConfigHook.supported) {
      throw new Error(
        "expected unsupported capability when config hook is absent",
      );
    }
    expect(missingConfigHook.reason).toContain("config hook");
    expect(missingCommandField.supported).toBe(false);
    if (missingCommandField.supported) {
      throw new Error(
        "expected unsupported capability when command field is absent",
      );
    }
    expect(missingCommandField.reason).toContain("command field");

    const result = registerKibiBootstrapCommand(configInput, missingCommandField);

    expect(result.supported).toBe(false);
    expect(configInput).toEqual({
      command: {
        existing: {
          template: "Existing command",
        },
      },
    });
  });

  test("resolves SDK package from Bun transitive plugin sibling layout", () => {
    const scopeRoot = fs.mkdtempSync(path.join(tmpBase, "opencode-scope-"));
    const pluginRoot = path.join(scopeRoot, "plugin");
    const sdkRoot = path.join(scopeRoot, "sdk");
    fs.mkdirSync(pluginRoot, { recursive: true });
    fs.mkdirSync(sdkRoot, { recursive: true });
    const sdkPackageJsonPath = path.join(sdkRoot, "package.json");
    fs.writeFileSync(
      sdkPackageJsonPath,
      JSON.stringify({ name: "@opencode-ai/sdk" }),
    );

    expect(findSdkPackageJsonForPluginRoot(pluginRoot)).toBe(
      sdkPackageJsonPath,
    );
  });

  test("registers native kibi-bootstrap alias without repo-local command files", async () => {
    const dir = makeProjectDir();
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });

    assert.ok(hooks.config, "supported hosts should expose a config hook");
    const configHook = hooks.config;
    assert.ok(configHook, "supported hosts should expose a config hook");

    const configInput: OpenCodeConfigHookInput = {};
    await configHook(configInput);

    assert.ok(
      configInput.command,
      "config hook should populate config.command",
    );
    expect(configInput.command[KIBI_BOOTSTRAP_COMMAND_NAME]).toBeDefined();
    expect(configInput.command[KIBI_BOOTSTRAP_COMMAND_NAME]?.description).toBe(
      KIBI_BOOTSTRAP_COMMAND_DESCRIPTION,
    );
    // Verify the command is registered by the plugin, not requiring repo-local files
    assert.ok(
      !fs.existsSync(path.join(dir, ".opencode", "commands", "kibi-bootstrap.md")),
      "should not require repo-local command file",
    );
  });

  test("native kibi-bootstrap matches MCP bootstrap contract", () => {
    const alias = buildKibiBootstrapAlias();
    expect(alias).toContain("canonical `kibi-bootstrap` skill");
    expect(alias).toContain("kibi init");
    expect(alias).toContain("/kibi:kibi-bootstrap:mcp");
    expect(alias).not.toContain("kb_upsert");
    expect(alias).not.toContain("kb_apply_plan");
  });

  test("rejects drift from MCP kibi-bootstrap semantics", () => {
    const alias = buildKibiBootstrapAlias();
    expect(alias).toContain("kibi init");
    expect(alias).not.toContain("kibi doctor");
    expect(alias).not.toContain("7-phase");
  });

  test("canonicalizes short alias over namespaced prompt", () => {
    const guidance = buildPromptWithCapability({
      supported: true,
      pluginVersion: "test-supported",
    });

    expect(guidance).toContain("/kibi-bootstrap");
    expect(guidance).toContain("canonical `kibi-bootstrap` skill");
  });

  test("falls back to namespaced MCP prompt when injection unsupported", () => {
    const guidance = buildPromptWithCapability({
      supported: false,
      reason: "test host lacks native command injection",
    });

    expect(guidance).toContain("/kibi:kibi-bootstrap:mcp");
    expect(guidance).toContain("cannot inject native `/kibi-bootstrap`");
  });

  test("omits native kibi-bootstrap when plugin disabled", async () => {
    const dir = fs.mkdtempSync(path.join(tmpBase, "proj-disabled-"));
    fs.mkdirSync(path.join(dir, ".opencode"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".opencode", "kibi.json"),
      JSON.stringify({ enabled: false }),
    );

    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });

    assert.ok(!hooks.config, "disabled plugin should not expose config hook");
    assert.deepEqual(
      Object.keys(hooks),
      [],
      "disabled plugin should return empty hooks",
    );
  });
});
