import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildInitKibiAlias } from "./init-kibi-alias.js";

export const INIT_KIBI_COMMAND_NAME = "init-kibi";
export const INIT_KIBI_COMMAND_TEMPLATE = buildInitKibiAlias();
export const INIT_KIBI_COMMAND_DESCRIPTION = "Run the Kibi interactive activation workflow."; // implements REQ-001

export interface OpenCodeCommandDefinition {
  template: string;
  description?: string;
  agent?: string;
  model?: string;
  subtask?: boolean;
}

export interface OpenCodeConfigHookInput {
  command?: Record<string, OpenCodeCommandDefinition>;
  [key: string]: unknown;
}

export type InitKibiCommandCapability =
  | {
      supported: true;
      pluginVersion: string;
    }
  | {
      supported: false;
      reason: string;
      pluginVersion?: string;
    };

interface InitKibiCapabilityDetectionInput {
  pluginVersion?: string;
  pluginHooksDts?: string;
  sdkTypesDts?: string;
}

const require = createRequire(import.meta.url);
let cachedCapability: InitKibiCommandCapability | null = null;
const initialProcessCwd = process.cwd();
const initialEnvPwd = process.env.PWD;
const initialGithubWorkspace = process.env.GITHUB_WORKSPACE;

function* candidateHostRoots(startDir: string): Generator<string> {
  let current = path.resolve(startDir);

  while (true) {
    yield current;
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
}

function resolveDogfoodHostCapabilityInputs(
  startDirs: string[],
): InitKibiCapabilityDetectionInput | null {
  const seenRoots = new Set<string>();

  for (const startDir of startDirs) {
    for (const root of candidateHostRoots(startDir)) {
      if (seenRoots.has(root)) {
        continue;
      }
      seenRoots.add(root);

      const pluginPackageJsonPath = path.join(
        root,
        ".opencode",
        "node_modules",
        "@opencode-ai",
        "plugin",
        "package.json",
      );
      if (!fs.existsSync(pluginPackageJsonPath)) {
        continue;
      }

      const pluginRoot = path.dirname(pluginPackageJsonPath);
      const sdkPackageJsonCandidates = [
        path.join(
          root,
          ".opencode",
          "node_modules",
          "@opencode-ai",
          "sdk",
          "package.json",
        ),
        path.join(
          pluginRoot,
          "node_modules",
          "@opencode-ai",
          "sdk",
          "package.json",
        ),
      ];
      const sdkPackageJsonPath = sdkPackageJsonCandidates.find((candidate) =>
        fs.existsSync(candidate),
      );
      if (!sdkPackageJsonPath) {
        continue;
      }

      const sdkRoot = path.dirname(sdkPackageJsonPath);
      const pluginVersion = readPackageVersion(pluginPackageJsonPath);
      const pluginHooksDts = readTextIfExists(
        path.join(pluginRoot, "dist", "index.d.ts"),
      );
      const sdkTypesDts = readTextIfExists(
        path.join(sdkRoot, "dist", "v2", "gen", "types.gen.d.ts"),
      );

      // Dogfood host artifacts can be partially installed (package.json present, dist d.ts absent).
      // In that case we should keep probing/fallback instead of hard-failing capability detection.
      if (
        typeof pluginHooksDts !== "string" ||
        pluginHooksDts.length === 0 ||
        typeof sdkTypesDts !== "string" ||
        sdkTypesDts.length === 0
      ) {
        continue;
      }

      return {
        ...(pluginVersion ? { pluginVersion } : {}),
        pluginHooksDts,
        sdkTypesDts,
      };
    }
  }

  return null;
}

function buildUnsupportedReason(
  pluginVersion: string | undefined,
  detail: string,
): InitKibiCommandCapability {
  const prefix = pluginVersion
    ? `@opencode-ai/plugin@${pluginVersion}`
    : "@opencode-ai/plugin";
  return pluginVersion
    ? {
        supported: false,
        pluginVersion,
        reason: `${prefix} ${detail}`,
      }
    : {
      supported: false,
      reason: `${prefix} ${detail}`,
    };
}

function readTextIfExists(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function readPackageVersion(filePath: string): string | undefined {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

// implements REQ-opencode-kibi-briefing-v2
export function findSdkPackageJsonForPluginRoot(
  pluginRoot: string,
): string | undefined {
  const scopeRoot = path.dirname(pluginRoot);
  const candidates = [
    path.join(pluginRoot, "node_modules", "@opencode-ai", "sdk", "package.json"),
    path.join(scopeRoot, "sdk", "package.json"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function hasConfigHook(pluginHooksDts: string): boolean {
  return /\bconfig\??:\s*\(input:\s*Config\)\s*=>\s*Promise<void>\s*;/.test(
    pluginHooksDts,
  );
}

function hasConfigCommandField(sdkTypesDts: string): boolean {
  return /\bcommand\??:\s*\{[\s\S]*?\[key:\s*string\]:\s*\{[\s\S]*?\btemplate:\s*string\s*;/.test(
    sdkTypesDts,
  );
}

function resolveHostCapabilityInputs(): InitKibiCapabilityDetectionInput {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const dogfoodHost = resolveDogfoodHostCapabilityInputs(
    [
      process.cwd(),
      process.env.PWD,
      process.env.GITHUB_WORKSPACE,
      initialProcessCwd,
      initialEnvPwd,
      initialGithubWorkspace,
      moduleDir,
    ].filter((value): value is string =>
      typeof value === "string" && value.length > 0,
    ),
  );
  if (dogfoodHost) {
    return dogfoodHost;
  }

  try {
    const pluginPackageJsonPath = require.resolve(
      "@opencode-ai/plugin/package.json",
    );
    const pluginRoot = path.dirname(pluginPackageJsonPath);
    const sdkPackageJsonPath =
      findSdkPackageJsonForPluginRoot(pluginRoot) ??
      require.resolve("@opencode-ai/sdk/package.json");
    const sdkRoot = path.dirname(sdkPackageJsonPath);

    const pluginVersion = readPackageVersion(pluginPackageJsonPath);
    const pluginHooksDts = readTextIfExists(
      path.join(pluginRoot, "dist", "index.d.ts"),
    );
    const sdkTypesDts = readTextIfExists(
      path.join(sdkRoot, "dist", "v2", "gen", "types.gen.d.ts"),
    );

    return {
      ...(pluginVersion ? { pluginVersion } : {}),
      ...(pluginHooksDts ? { pluginHooksDts } : {}),
      ...(sdkTypesDts ? { sdkTypesDts } : {}),
    };
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCommandMap(
  value: unknown,
): value is Record<string, OpenCodeCommandDefinition> {
  return isRecord(value);
}

// implements REQ-opencode-kibi-briefing-v2
export function detectInitKibiCommandCapability(
  input: InitKibiCapabilityDetectionInput,
): InitKibiCommandCapability {
  const { pluginVersion, pluginHooksDts, sdkTypesDts } = input;

  if (typeof pluginHooksDts !== "string" || pluginHooksDts.length === 0) {
    return buildUnsupportedReason(
      pluginVersion,
      "host Hooks definition is unavailable for config hook inspection.",
    );
  }

  if (!hasConfigHook(pluginHooksDts)) {
    return buildUnsupportedReason(
      pluginVersion,
      "Hooks interface does not expose the config hook needed for native command injection.",
    );
  }

  if (typeof sdkTypesDts !== "string" || sdkTypesDts.length === 0) {
    return buildUnsupportedReason(
      pluginVersion,
      "SDK Config definition is unavailable for command surface inspection.",
    );
  }

  if (!hasConfigCommandField(sdkTypesDts)) {
    return buildUnsupportedReason(
      pluginVersion,
      "SDK Config type does not expose the command field needed for native command injection.",
    );
  }

  return {
    supported: true,
    pluginVersion: pluginVersion ?? "unknown",
  };
}

// implements REQ-opencode-kibi-briefing-v2
export function getInitKibiCommandCapability(): InitKibiCommandCapability {
  if (cachedCapability?.supported) {
    return cachedCapability;
  }

  cachedCapability = detectInitKibiCommandCapability(resolveHostCapabilityInputs());
  return cachedCapability;
}

// implements REQ-opencode-kibi-briefing-v2
export function registerInitKibiCommand(
  configInput: unknown,
  capability: InitKibiCommandCapability = getInitKibiCommandCapability(),
): InitKibiCommandCapability {
  if (!capability.supported) {
    return capability;
  }

  if (!isRecord(configInput)) {
    return buildUnsupportedReason(
      capability.pluginVersion,
      "config hook input is not an object.",
    );
  }

  const existingCommands = configInput.command;
  if (existingCommands !== undefined && !isCommandMap(existingCommands)) {
    return buildUnsupportedReason(
      capability.pluginVersion,
      "config hook input.command is not an object.",
    );
  }

  configInput.command = {
    ...(existingCommands ?? {}),
    [INIT_KIBI_COMMAND_NAME]: {
      template: INIT_KIBI_COMMAND_TEMPLATE,
      description: INIT_KIBI_COMMAND_DESCRIPTION,
    },
  } satisfies Record<string, OpenCodeCommandDefinition>;

  return capability;
}
