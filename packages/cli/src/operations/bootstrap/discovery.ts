import path from "node:path";

import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readKbManifestStatus } from "../../utils/kb-manifest.js";
import { classifyActivation } from "./activation.js";
import { scanEvidence } from "./discovery-evidence.js";
import {
  BOOTSTRAP_PROVIDER_ORDER,
  type BootstrapEvidence,
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

function languages(evidence: readonly BootstrapEvidence[]): string[] {
  return [
    ...new Set(
      evidence.flatMap((item) => {
        const extension = path.extname(item.label).slice(1);
        const fromExtension =
          item.kind === "source_symbols"
            ? [LANGUAGE_NAMES[extension] ?? extension]
            : [];
        const fromMetadata = Array.isArray(item.data.languages)
          ? item.data.languages.filter(
              (value): value is string => typeof value === "string",
            )
          : [];
        return [...fromExtension, ...fromMetadata];
      }),
    ),
  ].sort();
}

function frameworks(evidence: readonly BootstrapEvidence[]): string[] {
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

// implements REQ-mcp-kibi-bootstrap-bootstrap-v1, REQ-kibi-operation-interface-parity
// implements REQ-KIBI-BOOTSTRAP-PLAN
export async function discoverBootstrap(
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
      BOOTSTRAP_PROVIDER_ORDER.indexOf(left.provider) -
        BOOTSTRAP_PROVIDER_ORDER.indexOf(right.provider) ||
      left.label.localeCompare(right.label),
  );
  const providersRun = activation.allowCandidateGeneration
    ? [...BOOTSTRAP_PROVIDER_ORDER]
    : [];
  const providerCounts = Object.fromEntries(
    BOOTSTRAP_PROVIDER_ORDER.map((provider) => [
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
