import {
  type AutopilotGenerateArgs,
  type AutopilotGenerateResult,
  type Candidate,
  type DiscoverySummary,
  presentAutopilot,
  selectAutopilotCandidates,
} from "kibi-cli/operations";
import type { PrologProcess } from "kibi-cli/prolog";

import { resolveWorkspaceRoot } from "../workspace.js";
import {
  activation,
  candidate,
  record,
  signal,
} from "./autopilot-test-parsers.js";

export type LegacyDependencies = Readonly<Record<string, unknown>>;
let testDependencies: LegacyDependencies | undefined;

export function setTestDependencies(dependencies: LegacyDependencies): void {
  testDependencies = dependencies;
}

export function resetTestDependencies(): void {
  testDependencies = undefined;
}

async function invoke(
  dependencies: LegacyDependencies,
  name: string,
  values: readonly unknown[],
): Promise<unknown> {
  const callable = dependencies[name];
  return typeof callable === "function"
    ? Reflect.apply(callable, undefined, [...values])
    : undefined;
}

export async function executeTestDependencies(
  prolog: PrologProcess,
  input: AutopilotGenerateArgs,
): Promise<AutopilotGenerateResult | null> {
  const dependencies = testDependencies;
  if (!dependencies) return null;
  const root = resolveWorkspaceRoot();
  const policy = activation(
    await invoke(dependencies, "resolveActivationPolicy", [root, prolog]),
  );
  if (!policy) return null;
  const discovered = record(
    await invoke(dependencies, "discoverProviderEvidence", [root, policy]),
  );
  const rawSummary = record(discovered?.summary);
  const summary: DiscoverySummary = {
    activationState: policy.activationState,
    activationMode: policy.activationMode,
    applyBlocked: policy.applyBlocked,
    reason: policy.reason,
    providersRun: [],
    providerCounts: {},
    detectedLanguages: [],
    detectedTestFrameworks: [],
    excludedRoots: [],
    truncated: false,
    scanWarnings: [],
    ...(rawSummary ? Object.fromEntries(Object.entries(rawSummary)) : {}),
  };
  const rawEntities = await invoke(dependencies, "loadEntities", [prolog, {}]);
  const existingIds = new Set(
    Array.isArray(rawEntities)
      ? rawEntities
          .map((entry) => record(entry)?.id)
          .filter((id): id is string => typeof id === "string")
      : [],
  );
  const discoveryInput = {
    evidence: Array.isArray(discovered?.evidence) ? discovered.evidence : [],
  };
  const context = { ids: existingIds, workspaceRoot: root };
  const minConfidence = Math.max(
    0.6,
    Math.min(0.95, input.minConfidence ?? 0.8),
  );
  const all: Candidate[] = [];
  for (const name of [
    "buildTypedMarkdownCandidates",
    "buildSymbolManifestCandidates",
    "buildGenericMarkdownCandidates",
    "buildNormativeRequirementCandidates",
    "buildProviderEvidenceCandidates",
  ]) {
    const result = await invoke(dependencies, name, [
      discoveryInput,
      context,
      minConfidence,
    ]);
    if (Array.isArray(result))
      all.push(...result.flatMap((entry) => candidate(entry) ?? []));
  }
  const rawSignals = await invoke(
    dependencies,
    "collectSourceOnlyAuthoringSignals",
    [discoveryInput, context, minConfidence],
  );
  const signals = Array.isArray(rawSignals)
    ? rawSignals.flatMap((entry) => signal(entry) ?? [])
    : [];
  const selected = selectAutopilotCandidates(
    all.filter((entry) => entry.confidence >= minConfidence),
    existingIds,
    input.entityTypes,
    Math.max(1, Math.min(200, Math.trunc(input.maxCandidates ?? 50))),
  );
  const warning = await invoke(dependencies, "getWorkspaceMigrationWarning", [
    root,
  ]);
  return presentAutopilot({
    root,
    activation: policy,
    discoverySummary: summary,
    migrationWarning: typeof warning === "string" ? warning : null,
    ...(input.bootstrapContext
      ? { bootstrapContext: input.bootstrapContext }
      : {}),
    candidates: selected.candidates,
    sourceOnlySignals: signals,
    suppressedCandidates: selected.suppressed,
  });
}
