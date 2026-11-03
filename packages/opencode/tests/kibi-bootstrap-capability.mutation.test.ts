import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  _resetKibiBootstrapCapabilityCacheForTests,
  detectKibiBootstrapCommandCapability,
  getKibiBootstrapCommandCapability,
  registerKibiBootstrapCommand,
  resolveDogfoodHostCapabilityInputs,
} from "../src/kibi-bootstrap-capability.js";

const HOOKS = "config?: (input: Config) => Promise<void>;";
const SDK = "command?: {\n  [key: string]: {\n    template: string;\n  };\n};";

function tempRoot(): string {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(tmpdir(), "kibi-boot-host-mut-")),
  );
  dirs.push(root);
  return root;
}

function put(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A host install under <root>/.opencode/node_modules. */
function host(
  root: string,
  options: {
    pluginPackage?: string | null;
    hooks?: string | null;
    sdkPackage?: "beside" | "nested" | null;
    sdkTypes?: string | null;
  } = {},
): void {
  const scope = path.join(root, ".opencode", "node_modules", "@opencode-ai");
  const plugin = path.join(scope, "plugin");
  fs.mkdirSync(plugin, { recursive: true });
  const pluginPackage =
    options.pluginPackage === undefined
      ? JSON.stringify({ version: "7.7.7" })
      : options.pluginPackage;
  if (pluginPackage !== null)
    put(path.join(plugin, "package.json"), pluginPackage);
  const hooks = options.hooks === undefined ? HOOKS : options.hooks;
  if (hooks !== null) put(path.join(plugin, "dist", "index.d.ts"), hooks);
  const sdkPackage =
    options.sdkPackage === undefined ? "beside" : options.sdkPackage;
  if (sdkPackage === null) return;
  const sdk =
    sdkPackage === "beside"
      ? path.join(scope, "sdk")
      : path.join(plugin, "node_modules", "@opencode-ai", "sdk");
  put(path.join(sdk, "package.json"), "{}");
  const sdkTypes = options.sdkTypes === undefined ? SDK : options.sdkTypes;
  if (sdkTypes !== null) {
    put(path.join(sdk, "dist", "v2", "gen", "types.gen.d.ts"), sdkTypes);
  }
}

const dirs: string[] = [];
const originalCwd = process.cwd();

afterEach(() => {
  _resetKibiBootstrapCapabilityCacheForTests();
  process.chdir(originalCwd);
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("host capability inputs", () => {
  test("a host plugin without an SDK is passed over", () => {
    const root = fs.realpathSync(
      fs.mkdtempSync(path.join(tmpdir(), "kibi-boot-mut-")),
    );
    dirs.push(root);
    const pluginRoot = path.join(
      root,
      ".opencode",
      "node_modules",
      "@opencode-ai",
      "plugin",
    );
    fs.mkdirSync(pluginRoot, { recursive: true });
    fs.writeFileSync(
      path.join(pluginRoot, "package.json"),
      JSON.stringify({ name: "@opencode-ai/plugin", version: "9.9.9" }),
    );
    process.chdir(root);
    const capability = getKibiBootstrapCommandCapability();
    expect(capability.pluginVersion).not.toBe("9.9.9");
  });

  test("without an SDK beside the plugin the SDK is resolved directly", () => {
    const realExists = fs.existsSync;
    const exists = spyOn(fs, "existsSync").mockImplementation(
      (candidate: fs.PathLike) =>
        !String(candidate).includes(`${path.sep}sdk${path.sep}`) &&
        !String(candidate).includes(".opencode") &&
        realExists(candidate),
    );
    try {
      // The SDK is not installed where this package can resolve it, so the
      // lookup fails and leaves no inputs.
      expect(getKibiBootstrapCommandCapability()).toEqual({
        supported: false,
        reason:
          "@opencode-ai/plugin host Hooks definition is unavailable for config hook inspection.",
      });
    } finally {
      exists.mockRestore();
    }
  });
});

describe("resolveDogfoodHostCapabilityInputs", () => {
  test("finds a complete install at an ancestor of a start directory", () => {
    const root = tempRoot();
    host(root);
    const deep = path.join(root, "a", "b");
    fs.mkdirSync(deep, { recursive: true });
    expect(resolveDogfoodHostCapabilityInputs([deep, deep])).toEqual({
      pluginVersion: "7.7.7",
      pluginHooksDts: HOOKS,
      sdkTypesDts: SDK,
    });
  });

  test("a nested SDK counts; a version that is not a string is left out", () => {
    const root = tempRoot();
    host(root, {
      sdkPackage: "nested",
      pluginPackage: JSON.stringify({ version: 5 }),
    });
    expect(resolveDogfoodHostCapabilityInputs([root])).toEqual({
      pluginHooksDts: HOOKS,
      sdkTypesDts: SDK,
    });
  });

  test.each([
    ["no plugin package", { pluginPackage: null }],
    ["no hooks types", { hooks: null }],
    ["empty hooks types", { hooks: "" }],
    ["no SDK", { sdkPackage: null }],
    ["no SDK types", { sdkTypes: null }],
    ["empty SDK types", { sdkTypes: "" }],
  ] as const)("an install with %s is passed over", (_name, options) => {
    const root = tempRoot();
    host(root, options);
    expect(resolveDogfoodHostCapabilityInputs([root])).toBeNull();
  });

  test("a malformed plugin package has no version", () => {
    const root = tempRoot();
    host(root, { pluginPackage: "{" });
    expect(resolveDogfoodHostCapabilityInputs([root])).toEqual({
      pluginHooksDts: HOOKS,
      sdkTypesDts: SDK,
    });
  });
});

describe("detectKibiBootstrapCommandCapability", () => {
  test.each([
    "config: (input: Config) => Promise<void>;",
    "config?:  (input:  Config)  =>  Promise<void>  ;",
    "config?:(input:Config)=>Promise<void>;",
  ])("the config hook %p is recognized", (hooks) => {
    expect(
      detectKibiBootstrapCommandCapability({
        pluginHooksDts: hooks,
        sdkTypesDts: SDK,
      }),
    ).toEqual({ supported: true, pluginVersion: "unknown" });
  });

  test.each([
    "command: {\n  other: number;\n  [key: string]: {\n    description: string;\n    template: string;\n  };\n};",
    "command?:  {  [key:  string]:  {  template:  string  ;",
    "command?:{[key:string]:{template:string;",
  ])("the command field %p is recognized", (sdk) => {
    expect(
      detectKibiBootstrapCommandCapability({
        pluginVersion: "1",
        pluginHooksDts: HOOKS,
        sdkTypesDts: sdk,
      }),
    ).toEqual({ supported: true, pluginVersion: "1" });
  });

  test.each([
    "subconfig?: (input: Config) => Promise<void>;",
    "config?: (input: Config) => Promise<void>",
  ])("the hook %p is not the config hook", (hooks) => {
    expect(
      detectKibiBootstrapCommandCapability({
        pluginHooksDts: hooks,
        sdkTypesDts: SDK,
      }),
    ).toEqual({
      supported: false,
      reason:
        "@opencode-ai/plugin Hooks interface does not expose the config hook needed for native command injection.",
    });
  });

  test.each([
    "subcommand?: { [key: string]: { template: string; } }",
    "command?: { [key: string]: { mytemplate: string; } }",
  ])("the field %p is not the command field", (sdk) => {
    expect(
      detectKibiBootstrapCommandCapability({
        pluginHooksDts: HOOKS,
        sdkTypesDts: sdk,
      }).supported,
    ).toBe(false);
  });

  test("missing SDK types are reported as unavailable", () => {
    expect(
      detectKibiBootstrapCommandCapability({ pluginHooksDts: HOOKS }),
    ).toEqual({
      supported: false,
      reason:
        "@opencode-ai/plugin SDK Config definition is unavailable for command surface inspection.",
    });
  });
});

describe("the installed host", () => {
  test("is read from the installed plugin and SDK", () => {
    const version = JSON.parse(
      fs.readFileSync(
        path.join(
          import.meta.dir,
          "..",
          "node_modules",
          "@opencode-ai",
          "plugin",
          "package.json",
        ),
        "utf8",
      ),
    ).version;
    expect(getKibiBootstrapCommandCapability()).toEqual({
      supported: true,
      pluginVersion: version,
    });
  });
});

describe("registerKibiBootstrapCommand", () => {
  const supported = { supported: true as const, pluginVersion: "1" };

  test("adds the command next to existing ones", () => {
    const config: Record<string, unknown> = {
      command: { x: { template: "t" } },
    };
    expect(registerKibiBootstrapCommand(config, supported)).toBe(supported);
    expect(config.command).toEqual({
      x: { template: "t" },
      "kibi-bootstrap": {
        template: expect.any(String),
        description: "Bootstrap Kibi knowledge for an existing repository.",
      },
    });
  });

  test.each([[null], [[]], ["text"]])("a config of %p is refused", (config) => {
    expect(registerKibiBootstrapCommand(config, supported)).toEqual({
      supported: false,
      pluginVersion: "1",
      reason: "@opencode-ai/plugin@1 config hook input is not an object.",
    });
  });

  test("a command list that is not a map is refused", () => {
    expect(
      registerKibiBootstrapCommand({ command: ["x"] }, supported).supported,
    ).toBe(false);
  });
});
