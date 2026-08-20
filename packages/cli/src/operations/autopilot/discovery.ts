import path from "node:path";

import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readKbManifestStatus } from "../../utils/kb-manifest.js";
import { classifyActivation } from "./activation.js";
import { scanEvidence } from "./discovery-evidence.js";
import {
  AUTOPILOT_PROVIDER_ORDER,
  type AutopilotEvidence,
  type DiscoveryResult,
} from "./types.js";

const EXCLUDED_ROOTS = [
  ".git",
  ".kb",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "third-party",
  "third_party",
  "vendor",
  "vendors",
  "venv",
] as const;
const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
};

async function migrationWarning(
  context: OperationContext,
): Promise<string | null> {
  try {
    const status = readKbManifestStatus(context.workspaceRoot);
    if (status.state === "ok") return null;
    return status.warning;
  } catch {
    return null;
  }
}

function languages(evidence: readonly AutopilotEvidence[]): string[] {
  return [
    ...new Set(
      evidence
        .filter((item) => item.kind === "source_symbols")
        .map((item) => {
          const extension = path.extname(item.label).slice(1);
          return LANGUAGE_NAMES[extension] ?? extension;
        }),
    ),
  ].sort();
}

function frameworks(evidence: readonly AutopilotEvidence[]): string[] {
  return [
    ...new Set(
      evidence.flatMap((item) =>
        Array.isArray(item.data.frameworks)
          ? item.data.frameworks.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
      ),
    ),
  ].sort();
}

// implements REQ-mcp-init-kibi-autopilot-v1, REQ-kibi-operation-interface-parity
export async function discoverAutopilot(
  context: OperationContext,
): Promise<DiscoveryResult> {
  const scan = await scanEvidence(context);
  const ignored = new Set(scan.ignoredSources);
  const activation = await classifyActivation(
    context,
    scan.files.filter((file) => !ignored.has(file)),
  );
  const evidence = activation.allowCandidateGeneration
    ? [...scan.evidence]
    : [];
  evidence.sort(
    (left, right) =>
      AUTOPILOT_PROVIDER_ORDER.indexOf(left.provider) -
        AUTOPILOT_PROVIDER_ORDER.indexOf(right.provider) ||
      left.label.localeCompare(right.label),
  );
  const providersRun = activation.allowCandidateGeneration
    ? [...AUTOPILOT_PROVIDER_ORDER]
    : [];
  const providerCounts = Object.fromEntries(
    AUTOPILOT_PROVIDER_ORDER.map((provider) => [
      provider,
      evidence.filter((item) => item.provider === provider).length,
    ]),
  );
  return {
    activation,
    evidence,
    ignoredSources: scan.ignoredSources,
    migrationWarning: await migrationWarning(context),
    summary: {
      activationState: activation.activationState,
      activationMode: activation.activationMode,
      applyBlocked: activation.applyBlocked,
      reason: activation.reason,
      ...(activation.handoffMessage
        ? { handoffMessage: activation.handoffMessage }
        : {}),
      providersRun,
      providerCounts,
      detectedLanguages: languages(evidence),
      detectedTestFrameworks: frameworks(evidence),
      excludedRoots: [...EXCLUDED_ROOTS].sort(),
      truncated: false,
      scanWarnings: [...new Set(scan.warnings)].sort(),
    },
  };
}
