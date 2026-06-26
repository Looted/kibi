// implements REQ-opencode-worktree-hard-enforcement-v1
import type { E2eCoverageSignal } from "./e2e-coverage-signals.js";
import type { FileLifecycle, ReminderKind } from "./file-operation-state.js";
import type { KbFreshnessEvidence } from "./kb-freshness-state.js";
import { evaluateKbFreshness } from "./kb-freshness-state.js";
import type { PathKind } from "./path-kind.js";
import type { RepoPosture } from "./repo-posture.js";
import type { RiskClass } from "./risk-classifier.js";
import type { EffectiveMode } from "./smart-enforcement.js";
import type { WorkContext } from "./work-context-resolver.js";

export interface PolicyLinkedEntityResult {
  ids: string[];
  source: "symbols" | "doc-path" | "none";
}

export interface EnforcementLifecycleEvent {
  normalizedPath: string;
  lifecycle: FileLifecycle;
}

export type CheckpointEvidence =
  | boolean
  | {
      hasCheckpoint?: boolean;
      kbSearch?: boolean;
      sourceFileQuery?: boolean;
      kbStatus?: boolean;
      kbCheck?: boolean;
      kbUpsert?: boolean;
      freshness?: KbFreshnessEvidence;
    };

export interface EnforcementPolicyInput {
  /** Resolved work context for the current file/prompt cycle. */
  resolvedContext?: WorkContext | undefined;
  /** Alias accepted by callers/tests that already carry WorkContext as workContext. */
  workContext?: WorkContext | undefined;
  /** Effective enforcement mode after config/posture resolution. */
  effectiveMode: EffectiveMode;
  /** Coalesced lifecycle events for this prompt cycle. */
  lifecycleEvents: EnforcementLifecycleEvent[];
  /** Path kinds aligned by index with lifecycleEvents. */
  pathKinds: PathKind[];
  /** Linked entity lookups aligned by index with lifecycleEvents. */
  linkedEntityResults?: PolicyLinkedEntityResult[] | undefined;
  /** Convenience linked-ID-only input aligned by index with lifecycleEvents. */
  linkedEntityIds?: string[][] | undefined;
  /** E2e signals aligned by index with lifecycleEvents. */
  e2eSignals?: E2eCoverageSignal[] | undefined;
  /** Semantic risk for the current focus event. */
  currentSemanticRisk?: RiskClass | undefined;
  /** Whether a Kibi checkpoint already happened in this cycle. */
  checkpointEvidence?: CheckpointEvidence | undefined;
  /** Posture fallback when resolvedContext is unavailable. */
  posture?: RepoPosture | undefined;
}

interface NormalizedPolicyEvent extends EnforcementLifecycleEvent {
  pathKind: PathKind;
  linkedEntityResult: PolicyLinkedEntityResult;
  e2eSignal: E2eCoverageSignal;
}

interface EnforcementPolicyResultBase {
  affectedPaths: string[];
  dirtyFileCount: number;
  e2eReminder: string | null;
  reminderKindsToMark: ReminderKind[];
}

export type EnforcementPolicyResult =
  | (EnforcementPolicyResultBase & {
      kind: "skip_non_authoritative";
      reason: string;
      text: null;
    })
  | (EnforcementPolicyResultBase & {
      kind: "advisory_guidance";
      text: string;
    })
  | (EnforcementPolicyResultBase & {
      kind: "hard_block";
      text: string;
      shownPaths: string[];
      remainingCount: number;
    })
  | (EnforcementPolicyResultBase & {
      kind: "checkpoint_passed";
      text: null;
    });

const NO_E2E_SIGNAL: E2eCoverageSignal = {
  level: "none",
  evidence: [],
  reminderText: null,
};

const DEFAULT_LINKED_ENTITY_RESULT: PolicyLinkedEntityResult = {
  ids: [],
  source: "none",
};

const HARD_BLOCK_PATH_LIMIT = 5;

const AUTHORITATIVE_POSTURES: ReadonlySet<RepoPosture> = new Set([
  "root_active",
  "hybrid_root_plus_vendored",
]);

const ADVISORY_EDIT_KINDS: ReadonlySet<PathKind> = new Set([
  "code",
  "requirement",
  "scenario",
  "test",
  "adr",
  "fact",
  "flag",
  "event",
  "symbol",
  "kb",
]);

const SOURCE_IMPACT_KINDS: ReadonlySet<PathKind> = new Set(["code"]);

function normalizeCheckpointEvidence(
  evidence: CheckpointEvidence | undefined,
): boolean {
  if (typeof evidence === "boolean") {
    return evidence;
  }
  if (!evidence) {
    return false;
  }

  // Freshness evidence is more authoritative than legacy booleans
  if (evidence.freshness) {
    return evaluateKbFreshness(evidence.freshness).allowsCompletion;
  }

  // Legacy boolean check
  return (
    evidence.hasCheckpoint === true ||
    evidence.kbSearch === true ||
    evidence.sourceFileQuery === true ||
    evidence.kbStatus === true ||
    evidence.kbCheck === true ||
    evidence.kbUpsert === true
  );
}

function isAuthoritative(input: EnforcementPolicyInput): boolean {
  const context = input.resolvedContext ?? input.workContext;
  if (context) {
    return context.isAuthoritative;
  }
  return input.posture ? AUTHORITATIVE_POSTURES.has(input.posture) : true;
}

function normalizeEvents(
  input: EnforcementPolicyInput,
): NormalizedPolicyEvent[] {
  return input.lifecycleEvents.map((event, index) => {
    const linkedEntityResult =
      input.linkedEntityResults?.[index] ??
      (input.linkedEntityIds?.[index]
        ? {
            ids: input.linkedEntityIds[index] ?? [],
            source: "symbols" as const,
          }
        : DEFAULT_LINKED_ENTITY_RESULT);

    return {
      ...event,
      pathKind: input.pathKinds[index] ?? "unknown",
      linkedEntityResult,
      e2eSignal: input.e2eSignals?.[index] ?? NO_E2E_SIGNAL,
    };
  });
}

function isIgnoredKind(pathKind: PathKind | "ignored"): boolean {
  return pathKind === "ignored";
}

function isRelevantEvent(
  event: NormalizedPolicyEvent,
  effectiveMode: EffectiveMode,
): boolean {
  if (isIgnoredKind(event.pathKind)) {
    return false;
  }

  if (effectiveMode === "hard") {
    return true;
  }

  if (event.lifecycle === "created") {
    return event.pathKind === "code";
  }

  if (event.lifecycle === "edited") {
    return ADVISORY_EDIT_KINDS.has(event.pathKind);
  }

  return true;
}

function uniqueReminderKinds(events: NormalizedPolicyEvent[]): ReminderKind[] {
  const kinds: ReminderKind[] = [];
  const add = (kind: ReminderKind) => {
    if (!kinds.includes(kind)) {
      kinds.push(kind);
    }
  };

  for (const event of events) {
    if (event.lifecycle === "deleted") {
      add("kibi_delete");
    } else {
      add("kibi_write");
    }

    if (
      event.e2eSignal.level !== "none" &&
      event.e2eSignal.reminderText !== null
    ) {
      add(event.lifecycle === "deleted" ? "e2e_delete" : "e2e_write");
    }
  }

  return kinds;
}

function firstE2eReminder(events: NormalizedPolicyEvent[]): string | null {
  return (
    events.find(
      (event) =>
        event.e2eSignal.level !== "none" &&
        event.e2eSignal.reminderText !== null,
    )?.e2eSignal.reminderText ?? null
  );
}

function lifecycleLabel(lifecycle: FileLifecycle): string {
  switch (lifecycle) {
    case "created":
      return "created";
    case "edited":
      return "edited";
    case "deleted":
      return "deleted";
  }
}

function advisoryText(event: NormalizedPolicyEvent): string {
  if (event.lifecycle === "created") {
    return "- New file detected. Add or update the necessary Kibi entities and traceability before completing this task.";
  }

  if (event.lifecycle === "edited") {
    if (SOURCE_IMPACT_KINDS.has(event.pathKind)) {
      const impactCheckCall = `kb_check({sourceFiles:["${event.normalizedPath}"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})`;
      return [
        `- Edited source file detected. Run \`${impactCheckCall}\` while the edit context is fresh.`,
        "  Use the impact diagnostics to review symbol granularity, requirement ownership, and semantic review of linked requirements/tests before completing this task.",
      ].join("\n");
    }

    return `- Edited file detected. Review Kibi traceability for ${event.normalizedPath} before completing this task.`;
  }

  const ids = event.linkedEntityResult.ids;
  if (ids.length > 0) {
    return `- Deleted file had linked Kibi entities: ${ids.join(", ")}. Update Kibi to keep traceability accurate.`;
  }

  return "- Deleted file had no linked Kibi entities. Update Kibi if this removal changes documented behavior or traceability.";
}

function collectUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function linkedIdsText(events: NormalizedPolicyEvent[]): string | null {
  const ids = collectUnique(
    events.flatMap((event) => event.linkedEntityResult.ids),
  );
  if (ids.length === 0) {
    return null;
  }
  return `Linked IDs detected: ${ids.join(", ")}.`;
}

function e2eEvidenceText(events: NormalizedPolicyEvent[]): string | null {
  const evidence = collectUnique(
    events.flatMap((event) => event.e2eSignal.evidence),
  );
  if (evidence.length === 0) {
    return null;
  }
  return `Existing e2e evidence: ${evidence.join(", ")}.`;
}

function hardBlockText(events: NormalizedPolicyEvent[]): {
  text: string;
  shownPaths: string[];
  remainingCount: number;
} {
  const shownEvents = events.slice(0, HARD_BLOCK_PATH_LIMIT);
  const shownPaths = shownEvents.map((event) => event.normalizedPath);
  const remainingCount = Math.max(0, events.length - shownEvents.length);
  const pathLines = shownEvents.map((event) => {
    const ids = event.linkedEntityResult.ids;
    const linkedSuffix = ids.length > 0 ? `; linked: ${ids.join(", ")}` : "";
    return `- \`${event.normalizedPath}\` (${lifecycleLabel(event.lifecycle)}, ${event.pathKind}${linkedSuffix})`;
  });

  if (remainingCount > 0) {
    pathLines.push(`- +${remainingCount} more dirty files`);
  }

  const deletedWithoutLinks = events.some(
    (event) =>
      event.lifecycle === "deleted" &&
      event.linkedEntityResult.ids.length === 0,
  );
  const representativePath = events[0]?.normalizedPath ?? "<changed-file>";
  const evidenceNotes = [linkedIdsText(events), e2eEvidenceText(events)].filter(
    (note): note is string => note !== null,
  );
  const deletionCleanup = deletedWithoutLinks
    ? "Deleted files without linked IDs still need sourceFile cleanup: use `kb_search` plus `kb_query` with `sourceFile` for the deleted path before deciding whether `kb_upsert` cleanup is needed."
    : "Use `kb_upsert` when traceability, relationships, or source-linked facts need updates.";

  return {
    text: [
      "🛑 **Hard Kibi checkpoint required**",
      "Changed relevant files require Kibi verification before continuing:",
      ...pathLines,
      ...evidenceNotes,
      "MCP-only checkpoint instructions:",
      "- Run `kb_search` to discover impacted requirements, tests, ADRs, and facts.",
      `- Run \`kb_query\` with \`sourceFile\` (example sourceFile: \"${representativePath}\") for each listed path.`,
      "- Run `kb_status` if branch or snapshot freshness matters.",
      `- ${deletionCleanup}`,
      "- Run `kb_check` before completing the task.",
      "KB freshness resolution:",
      "- **KB updated**: run `kb_search` for discovery, then `kb_upsert`/`kb_delete` for mutations, then `kb_check`.",
      "- **No KB impact**: provide a no-impact rationale in your final report after source-linked discovery via `kb_search` or `kb_query(sourceFile=...)` and `kb_check`.",
      "- **Deferred/failed**: do not claim task completion.",
    ].join("\n"),
    shownPaths,
    remainingCount,
  };
}

// implements REQ-opencode-worktree-hard-enforcement-v1
export function computeEnforcementPolicy(
  input: EnforcementPolicyInput,
): EnforcementPolicyResult {
  const allEvents = normalizeEvents(input);
  const relevantEvents = allEvents.filter((event) =>
    isRelevantEvent(event, input.effectiveMode),
  );
  const affectedPaths = relevantEvents.map((event) => event.normalizedPath);
  const e2eReminder = firstE2eReminder(relevantEvents);
  const reminderKindsToMark = uniqueReminderKinds(relevantEvents);

  if (relevantEvents.length === 0) {
    return {
      kind: "checkpoint_passed",
      affectedPaths,
      dirtyFileCount: 0,
      e2eReminder,
      reminderKindsToMark,
      text: null,
    };
  }

  if (input.effectiveMode === "hard") {
    if (!isAuthoritative(input)) {
      return {
        kind: "skip_non_authoritative",
        reason: "Hard enforcement only applies to authoritative Kibi roots.",
        affectedPaths,
        dirtyFileCount: relevantEvents.length,
        e2eReminder,
        reminderKindsToMark: [],
        text: null,
      };
    }

    if (normalizeCheckpointEvidence(input.checkpointEvidence)) {
      return {
        kind: "checkpoint_passed",
        affectedPaths,
        dirtyFileCount: relevantEvents.length,
        e2eReminder,
        reminderKindsToMark,
        text: null,
      };
    }

    const { text, shownPaths, remainingCount } = hardBlockText(relevantEvents);
    return {
      kind: "hard_block",
      affectedPaths,
      dirtyFileCount: relevantEvents.length,
      e2eReminder,
      reminderKindsToMark,
      text,
      shownPaths,
      remainingCount,
    };
  }

  if (!isAuthoritative(input)) {
    return {
      kind: "skip_non_authoritative",
      reason: "Lifecycle guidance is skipped outside authoritative Kibi roots.",
      affectedPaths,
      dirtyFileCount: relevantEvents.length,
      e2eReminder,
      reminderKindsToMark: [],
      text: null,
    };
  }

  const firstRelevantEvent = relevantEvents[0];
  if (!firstRelevantEvent) {
    return {
      kind: "checkpoint_passed",
      affectedPaths,
      dirtyFileCount: 0,
      e2eReminder,
      reminderKindsToMark,
      text: null,
    };
  }

  return {
    kind: "advisory_guidance",
    affectedPaths,
    dirtyFileCount: relevantEvents.length,
    e2eReminder,
    reminderKindsToMark,
    text: advisoryText(firstRelevantEvent),
  };
}
