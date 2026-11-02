import path from "node:path";

import { needsConflictReview } from "./conflict-review.js";
import type { PluginOffer } from "./plugin-offers.js";
import type {
  ActivationPolicy,
  BootstrapDeclaredContext,
  Candidate,
  SourceOnlySignal,
} from "./types.js";

function relative(root: string, target: string): string {
  // Intent claims cite tickets and URLs, which are not workspace paths.
  if (!path.isAbsolute(target)) return target;
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
  offers: readonly PluginOffer[] = [],
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
  const seeded = activation.activationMode === "attached_seeded_handoff";
  const declaredClaims = declared.intentClaims?.length ?? 0;
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
      description: seeded
        ? `Review the ${candidates.length} candidate(s) planned from declared intent claims (discovered candidates are not generated on a seeded KB, and claims already in the KB are not planned again), then call kb_apply_plan after explicit approval.`
        : `Review the ${candidates.length} safe candidate(s) in the hash-bound plan, then call kb_apply_plan after explicit approval.`,
      candidateIds: candidates.map((candidate) => candidate.candidateId),
    });
  // On a seeded KB, declared claims the plan does not write go through the
  // compile workflow, not a second bootstrap.
  if (seeded && declaredClaims > 0 && candidates.length === 0)
    result.push({
      order: order++,
      kind: "handoff",
      description:
        "No declared intent claim could be planned. Claims already in the KB need nothing; compile each remaining claim with kb_compile_intent, citing its source and reference (see the Knowledge source diagnostics).",
    });
  // implements REQ-bootstrap-authoring-claim-review
  const toReview = signals.filter(needsConflictReview).length;
  if (signals.length > 0)
    result.push({
      order: order++,
      kind: "handoff",
      description: `Author ${[...new Set(signals.map((signal) => signal.kind.toUpperCase()))].join("/")} entities manually from source-only evidence${seeded ? "; compile declared claims left there with kb_compile_intent" : ""}.${toReview > 0 ? ` ${toReview} intent claim(s) left for authoring need a conflict review: when you compile each with kb_compile_intent, compare it with the current requirements its conflict-review diagnostic names and report the verdicts through conflictReviews.` : ""}`,
    });
  for (const offer of offers)
    result.push({
      order: order++,
      kind: "plugin_offer",
      package: offer.package,
      capability: offer.capability,
      mode: offer.mode,
      evidence: offer.evidence,
      ...(offer.alsoActivate === undefined
        ? {}
        : { alsoActivate: offer.alsoActivate }),
      ...(offer.alsoInstall === undefined
        ? {}
        : { alsoInstall: offer.alsoInstall }),
      description: `${offer.reason} (${summary(offer.evidence)}). Ask the operator whether to enable the experimental ${offer.package}; on yes, install ${offer.alsoInstall === undefined ? "it as a dev dependency" : `it and ${offer.alsoInstall.join(", ")} as dev dependencies`} and add it to package.json kibi.plugins with ${[
        [offer.capability, offer.mode] as const,
        ...Object.entries(offer.alsoActivate ?? {}),
      ]
        .map(([capability, mode]) => `"${capability}": { "mode": "${mode}" }`)
        .join(
          ", ",
        )}; on no, add "${offer.package}" to kibi.declinedPlugins so bootstrap stops offering it.`,
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
