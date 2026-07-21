import type {
  ActivationPolicy,
  Candidate,
  SourceOnlySignal,
} from "kibi-cli/operations";

export function record(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

export function candidate(value: unknown): Candidate | null {
  const item = record(value);
  if (
    !item ||
    typeof item.candidateId !== "string" ||
    typeof item.entityType !== "string" ||
    typeof item.title !== "string" ||
    typeof item.sourceKind !== "string" ||
    typeof item.sourcePath !== "string" ||
    typeof item.confidence !== "number" ||
    !Array.isArray(item.applyPlan)
  )
    return null;
  const relationships = Array.isArray(item.relationships)
    ? item.relationships.flatMap((entry) => {
        const relation = record(entry);
        return relation &&
          typeof relation.type === "string" &&
          typeof relation.from === "string" &&
          typeof relation.to === "string"
          ? [{ type: relation.type, from: relation.from, to: relation.to }]
          : [];
      })
    : [];
  const applyPlan = item.applyPlan
    .map(record)
    .filter(
      (entry): entry is Readonly<Record<string, unknown>> => entry !== null,
    );
  return {
    candidateId: item.candidateId,
    entityType: item.entityType,
    title: item.title,
    sourceKind: item.sourceKind,
    sourcePath: item.sourcePath,
    confidence: item.confidence,
    confidenceBand:
      typeof item.confidenceBand === "string" ? item.confidenceBand : "medium",
    evidence: Array.isArray(item.evidence)
      ? item.evidence.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
    relationships,
    applyPlan,
  };
}

export function signal(value: unknown): SourceOnlySignal | null {
  const item = record(value);
  if (
    !item ||
    !["req", "scenario", "test"].includes(String(item.kind)) ||
    typeof item.title !== "string" ||
    typeof item.sourcePath !== "string" ||
    typeof item.confidence !== "number"
  )
    return null;
  const kind =
    item.kind === "req"
      ? "req"
      : item.kind === "scenario"
        ? "scenario"
        : "test";
  return {
    kind,
    title: item.title,
    sourcePath: item.sourcePath,
    confidence: item.confidence,
    evidence: Array.isArray(item.evidence)
      ? item.evidence.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
  };
}

export function activation(value: unknown): ActivationPolicy | null {
  const item = record(value);
  if (
    !item ||
    typeof item.activationState !== "string" ||
    typeof item.activationMode !== "string" ||
    typeof item.applyBlocked !== "boolean" ||
    typeof item.allowCandidateGeneration !== "boolean" ||
    typeof item.reason !== "string"
  )
    return null;
  const states = new Set([
    "root_uninitialized",
    "root_partial",
    "vendored_only",
    "root_active_thin",
    "root_active_seeded",
  ]);
  const modes = new Set([
    "cold_start_bootstrap",
    "repair_bootstrap",
    "attached_thin_handoff",
    "attached_seeded_handoff",
    "vendored_blocked",
  ]);
  if (!states.has(item.activationState) || !modes.has(item.activationMode))
    return null;
  return {
    activationState:
      item.activationState === "root_partial"
        ? "root_partial"
        : item.activationState === "vendored_only"
          ? "vendored_only"
          : item.activationState === "root_active_thin"
            ? "root_active_thin"
            : item.activationState === "root_active_seeded"
              ? "root_active_seeded"
              : "root_uninitialized",
    activationMode:
      item.activationMode === "repair_bootstrap"
        ? "repair_bootstrap"
        : item.activationMode === "attached_thin_handoff"
          ? "attached_thin_handoff"
          : item.activationMode === "attached_seeded_handoff"
            ? "attached_seeded_handoff"
            : item.activationMode === "vendored_blocked"
              ? "vendored_blocked"
              : "cold_start_bootstrap",
    applyBlocked: item.applyBlocked,
    allowCandidateGeneration: item.allowCandidateGeneration,
    reason: item.reason,
    ...(typeof item.handoffMessage === "string"
      ? { handoffMessage: item.handoffMessage }
      : {}),
  };
}
