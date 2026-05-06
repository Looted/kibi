import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildInitKibiAlias } from "../src/init-kibi-alias";
import {
  detectInitKibiCommandCapability,
  getInitKibiCommandCapability,
  INIT_KIBI_COMMAND_DESCRIPTION,
  INIT_KIBI_COMMAND_NAME,
  INIT_KIBI_COMMAND_TEMPLATE,
  type InitKibiCommandCapability,
  type OpenCodeConfigHookInput,
  registerInitKibiCommand,
} from "../src/init-kibi-capability";
import kibiOpencodePlugin from "../src/index";
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
  capability: InitKibiCommandCapability,
): string {
  return buildPrompt(undefined, capability);
}

describe("init-kibi native command support", () => {
  let tmpBase: string;
  let homedirSpy: ReturnType<typeof spyOn>;

  beforeAll(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-init-kibi-command-"));
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
      JSON.stringify({ prompt: { hookMode: "auto" }, sync: { enabled: false } }),
    );
    return dir;
  }

  test("supports native init-kibi injection", async () => {
    const capability = getInitKibiCommandCapability();

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

    assert.ok(configInput.command, "config hook should populate config.command");
    expect(configInput.command.existing.template).toBe("Existing command");
    expect(configInput.command[INIT_KIBI_COMMAND_NAME]?.description).toBe(
      INIT_KIBI_COMMAND_DESCRIPTION,
    );
    expect(configInput.command[INIT_KIBI_COMMAND_NAME]?.template).toBe(
      INIT_KIBI_COMMAND_TEMPLATE,
    );
  });

  test("hard-stops when native injection unsupported", () => {
    const missingConfigHook = detectInitKibiCommandCapability({
      pluginVersion: "1.2.25",
      pluginHooksDts: "export interface Hooks { event?: () => Promise<void>; }",
      sdkTypesDts: SUPPORTED_SDK_DTS,
    });
    const missingCommandField = detectInitKibiCommandCapability({
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
      throw new Error("expected unsupported capability when config hook is absent");
    }
    expect(missingConfigHook.reason).toContain("config hook");
    expect(missingCommandField.supported).toBe(false);
    if (missingCommandField.supported) {
      throw new Error("expected unsupported capability when command field is absent");
    }
    expect(missingCommandField.reason).toContain("command field");

    const result = registerInitKibiCommand(configInput, missingCommandField);

    expect(result.supported).toBe(false);
    expect(configInput).toEqual({
      command: {
        existing: {
          template: "Existing command",
        },
      },
    });
  });

  test("registers native init-kibi alias without repo-local command files", async () => {
    const dir = makeProjectDir();
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });

    assert.ok(hooks.config, "supported hosts should expose a config hook");
    const configHook = hooks.config;
    assert.ok(configHook, "supported hosts should expose a config hook");

    const configInput: OpenCodeConfigHookInput = {};
    await configHook(configInput);

    assert.ok(configInput.command, "config hook should populate config.command");
    expect(configInput.command[INIT_KIBI_COMMAND_NAME]).toBeDefined();
    expect(configInput.command[INIT_KIBI_COMMAND_NAME]?.description).toBe(
      INIT_KIBI_COMMAND_DESCRIPTION,
    );
    // Verify the command is registered by the plugin, not requiring repo-local files
    assert.ok(
      !fs.existsSync(path.join(dir, ".opencode", "commands", "init-kibi.md")),
      "should not require repo-local command file",
    );
  });

  test("native init-kibi matches MCP bootstrap contract", () => {
    const alias = buildInitKibiAlias();
    expect(alias).toContain("at most 4 bounded questions");
    expect(alias).toContain("kb_autopilot_generate");
    expect(alias).toContain("approval");
    expect(alias).toContain("kb_upsert");
    expect(alias).toContain("kb_check");
  });

  test("rejects drift from MCP init-kibi semantics", () => {
    const alias = buildInitKibiAlias();
    expect(alias).not.toContain("kibi init");
    expect(alias).not.toContain("kibi doctor");
    expect(alias).not.toContain("7-phase");
  });

  test("canonicalizes short alias over namespaced prompt", () => {
    const guidance = buildPromptWithCapability({
      supported: true,
      pluginVersion: "test-supported",
    });

    expect(guidance).toContain("/init-kibi");
    expect(guidance).toContain("canonical short alias");
    expect(guidance).toContain("/kibi:init-kibi:mcp");
    expect(guidance.indexOf("/init-kibi")).toBeLessThan(
      guidance.indexOf("/kibi:init-kibi:mcp"),
    );
  });

  test("falls back to namespaced MCP prompt when injection unsupported", () => {
    const guidance = buildPromptWithCapability({
      supported: false,
      reason: "test host lacks native command injection",
    });

    expect(guidance).toContain("/kibi:init-kibi:mcp");
    expect(guidance).toContain("fail closed");
    expect(guidance).not.toContain("`/init-kibi` is the canonical short alias");
    expect(guidance).toContain("does not support native `/init-kibi` injection");
  });

  test("omits native init-kibi when plugin disabled", async () => {
    const dir = fs.mkdtempSync(path.join(tmpBase, "proj-disabled-"));
    fs.mkdirSync(path.join(dir, ".opencode"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".opencode", "kibi.json"),
      JSON.stringify({ enabled: false }),
    );

    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });

    assert.ok(!hooks.config, "disabled plugin should not expose config hook");
    assert.deepEqual(Object.keys(hooks), [], "disabled plugin should return empty hooks");
  });
});
