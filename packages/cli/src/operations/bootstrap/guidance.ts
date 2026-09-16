import path from "node:path";

import { buildActions } from "./guidance-actions.js";
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

function counts(
  candidates: readonly Candidate[],
): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const candidate of candidates)
    result[candidate.entityType] = (result[candidate.entityType] ?? 0) + 1;
  return result;
}

function prompt(
  root: string,
  activation: ActivationPolicy,
  declared: BootstrapDeclaredContext,
  candidates: readonly Candidate[],
  signals: readonly SourceOnlySignal[],
  warnings: readonly string[],
): string {
  const bullets: string[] = [];
  bullets.push(
    activation.applyBlocked
      ? `- Apply blocked: ${activation.reason}`
      : `- Mode: ${activation.activationMode} (${activation.activationState}).`,
  );
  if (declared.projectSummary)
    bullets.push(`- Summary: ${declared.projectSummary}`);
  if (declared.sourceOfTruthPaths.length > 0)
    bullets.push(`- Source of truth: ${summary(declared.sourceOfTruthPaths)}.`);
  if (candidates.length > 0) {
    const formatted = Object.entries(counts(candidates))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, count]) => `${type} ${count}`)
      .join(", ");
    bullets.push(`- Safe candidates: ${candidates.length} (${formatted}).`);
  }
  if (signals.length > 0) {
    const kinds = [
      ...new Set(signals.map((signal) => signal.kind.toUpperCase())),
    ].join("/");
    const paths = [
      ...new Set(signals.map((signal) => relative(root, signal.sourcePath))),
    ];
    bullets.push(
      `- Author ${kinds} manually from ${summary(paths)}; keep them out of speculative candidate output.`,
    );
  } else if (declared.verificationAnchors.length > 0)
    bullets.push(
      `- Verify after kb_check with ${summary(declared.verificationAnchors, 2)}.`,
    );
  if (
    activation.activationMode === "attached_thin_handoff" ||
    activation.activationMode === "attached_seeded_handoff"
  )
    bullets.push(
      "- Handoff: use kb_search, kb_query, or gap/coverage tools to work with existing KB.",
    );
  if (warnings.length > 0)
    bullets.push(
      `- Scan diagnostics: ${warnings.length} warning(s) during evidence collection.`,
    );
  const words = bullets.slice(0, 5).join("\n").split(/\s+/).filter(Boolean);
  const selected = words.slice(0, 120);
  if (words.length > 120 && selected.length > 0)
    selected[selected.length - 1] = `${selected[selected.length - 1]}…`;
  return selected.join(" ").replaceAll(" - ", "\n- ");
}

export function confidence(
  activation: ActivationPolicy,
  declared: BootstrapDeclaredContext,
  candidates: readonly Candidate[],
  signals: readonly SourceOnlySignal[],
  promptBlock: string,
): Readonly<Record<string, unknown>> {
  const reasons: string[] = [];
  let score = candidates.length > 0 ? 0.68 : 0.44;
  if (activation.applyBlocked) {
    score -= 0.24;
    reasons.push("Current workspace posture blocks direct application.");
  } else {
    score += 0.12;
    reasons.push("Workspace posture allows read-only bootstrap synthesis.");
  }
  score += {
    cold_start_bootstrap: 0.1,
    repair_bootstrap: -0.05,
    attached_thin_bootstrap: 0.04,
    attached_thin_handoff: -0.12,
    attached_seeded_handoff: -0.18,
    vendored_blocked: -0.25,
  }[activation.activationMode];
  reasons.push(
    `${activation.activationMode} determined the bootstrap posture.`,
  );
  if (
    declared.projectSummary ||
    declared.sourceOfTruthPaths.length +
      declared.sourceOfTruthNotes.length +
      declared.priorityRoots.length +
      declared.verificationAnchors.length >
      0
  ) {
    score += 0.08;
    reasons.push("Declared bootstrap context grounds the output.");
  } else reasons.push("No declared bootstrap context was supplied.");
  if (signals.length > 0) {
    score += 0.04;
    reasons.push("Source-only evidence was routed into authoring guidance.");
  }
  if (candidates.length === 0) {
    score -= 0.08;
    reasons.push("No safe candidates were synthesized from current evidence.");
  } else
    reasons.push(
      `${candidates.length} safe candidate(s) are ready for review.`,
    );
  if (!promptBlock) {
    score -= 0.05;
    reasons.push(
      "Prompt block could not be assembled within the handoff budget.",
    );
  }
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 100) / 100;
  const level = rounded > 0.7 ? "high" : rounded >= 0.4 ? "medium" : "low";
  const policy =
    level === "high"
      ? "full_actions"
      : level === "medium"
        ? "review_required"
        : "handoff_only";
  if (level !== "high")
    reasons.push(
      level === "medium"
        ? "Medium confidence: review recommended before applying."
        : "Low confidence: handoff-only output with diagnostic guidance.",
    );
  return { score: rounded, level, reasons, policy };
}

// implements REQ-KIBI-BOOTSTRAP-PLAN
export function buildGuidance(input: {
  readonly root: string;
  readonly activation: ActivationPolicy;
  readonly declared: BootstrapDeclaredContext;
  readonly candidates: readonly Candidate[];
  readonly signals: readonly SourceOnlySignal[];
  readonly warnings: readonly string[];
}): {
  readonly promptBlock: string;
  readonly confidence: Readonly<Record<string, unknown>>;
  readonly actions: readonly Readonly<Record<string, unknown>>[];
} {
  const promptBlock = prompt(
    input.root,
    input.activation,
    input.declared,
    input.candidates,
    input.signals,
    input.warnings,
  );
  return {
    promptBlock,
    confidence: confidence(
      input.activation,
      input.declared,
      input.candidates,
      input.signals,
      promptBlock,
    ),
    actions: buildActions(
      input.root,
      input.activation,
      input.declared,
      input.candidates,
      input.signals,
    ),
  };
}
