import path from "node:path";

import type {
  ActivationPolicy,
  BootstrapDeclaredContext,
  Candidate,
  SourceOnlySignal,
} from "./types.js";

function relative(root: string, target: string): string {
  const value = path.relative(root, target);
  return value.startsWith("..") || path.isAbsolute(value)
    ? target.split(path.sep).join("/")
    : value.split(path.sep).join("/");
}

function summary(values: readonly string[], limit = 3): string {
  if (values.length === 0) return "workspace evidence";
  return values.length <= limit
    ? values.join(", ")
    : `${values.slice(0, limit).join(", ")} +${values.length - limit} more`;
}

export function buildActions(
  root: string,
  activation: ActivationPolicy,
  declared: BootstrapDeclaredContext,
  candidates: readonly Candidate[],
  signals: readonly SourceOnlySignal[],
): readonly Readonly<Record<string, unknown>>[] {
  const result: Record<string, unknown>[] = [];
  let order = 1;
  const targets = [
    ...new Set([
      ...declared.sourceOfTruthPaths,
      ...declared.priorityRoots,
      ...signals.map((signal) => relative(root, signal.sourcePath)),
    ]),
  ];
  result.push({
    order: order++,
    kind: "query",
    description:
      targets.length > 0
        ? `Review ${summary(targets)} before authoring or applying bootstrap output.`
        : "Review workspace evidence and existing KB records before applying bootstrap output.",
  });
  if (
    activation.activationMode === "attached_thin_handoff" ||
    activation.activationMode === "attached_seeded_handoff"
  ) {
    result.push({
      order: order++,
      kind: "handoff",
      description:
        "Use kb_search to explore existing KB entities and understand current coverage.",
    });
    result.push({
      order: order++,
      kind: "handoff",
      description:
        "Use kb_query or kb_graph with task-relevant IDs to inspect cited KB context.",
    });
    result.push({
      order: order++,
      kind: "handoff",
      description:
        activation.activationMode === "attached_thin_handoff"
          ? "Use kb_find_gaps to identify coverage holes and guide incremental KB growth."
          : "Use kb_coverage to review traceability and identify areas needing attention.",
    });
  }
  if (activation.applyBlocked)
    result.push({
      order: order++,
      kind: "handoff",
      description: activation.handoffMessage ?? activation.reason,
    });
  else if (candidates.length > 0)
    result.push({
      order: order++,
      kind: "plan",
      description: `Review the ${candidates.length} safe candidate(s) in the hash-bound plan, then call kb_apply_plan after explicit approval.`,
      candidateIds: candidates.map((candidate) => candidate.candidateId),
    });
  if (signals.length > 0)
    result.push({
      order: order++,
      kind: "handoff",
      description: `Author ${[...new Set(signals.map((signal) => signal.kind.toUpperCase()))].join("/")} entities manually from source-only evidence.`,
    });
  result.push({
    order,
    kind: "check",
    description:
      declared.verificationAnchors.length > 0
        ? `After kb_apply_plan, run kb_check and verify ${summary(declared.verificationAnchors, 2)}.`
        : "After kb_apply_plan, run kb_check to validate the resulting graph.",
  });
  return result;
}
