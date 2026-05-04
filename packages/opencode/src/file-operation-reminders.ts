// implements REQ-opencode-file-context-guidance-v1
import type { RepoPosture } from "./repo-posture.js";
import type { PathKind } from "./path-kind.js";
import type { RiskClass } from "./risk-classifier.js";
import type { ReminderKind } from "./file-operation-state.js";
import type {
  E2eCoverageSignal,
} from "./e2e-coverage-signals.js";

// ── Types ───────────────────────────────────────────────────────

export interface LinkedEntityResult {
  ids: string[];
  source: "symbols" | "doc-path" | "none";
}

export interface DeriveFileOperationReminderParams {
  normalizedPath: string;
  lifecycle: "created" | "edited" | "deleted";
  pathKind: PathKind;
  linkedEntityResult: LinkedEntityResult;
  e2eSignal: E2eCoverageSignal;
  currentSemanticRisk: RiskClass;
  posture: RepoPosture;
}

export interface DeriveFileOperationReminderResult {
  lifecycleReminder: string | null;
  e2eReminder: string | null;
  reminderKindsToMark: ReminderKind[];
}

// ── Lifecycle reminder text ─────────────────────────────────────

const NEW_FILE_REMINDER =
  "- New file detected. Add or update the necessary Kibi entities and traceability before completing this task.";

const DELETED_WITH_IDS_REMINDER = (ids: string): string =>
  `- Deleted file had linked Kibi entities: ${ids}. Update Kibi to keep traceability accurate.`;

const DELETED_NO_IDS_REMINDER =
  "- Deleted file had no linked Kibi entities. Update Kibi if this removal changes documented behavior or traceability.";

// ── Main exported function ────────────────────────────────────

// implements REQ-opencode-file-context-guidance-v1
export function deriveFileOperationReminder(
  params: DeriveFileOperationReminderParams,
): DeriveFileOperationReminderResult {
  const {
    lifecycle,
    pathKind,
    linkedEntityResult,
    e2eSignal,
    posture,
  } = params;

  // Check if posture allows lifecycle reminders
  const isAuthoritativePosture =
    posture === "root_active" || posture === "hybrid_root_plus_vendored";

  // Derive lifecycle reminder
  let lifecycleReminder: string | null = null;
  const reminderKindsToMark: ReminderKind[] = [];

  if (isAuthoritativePosture) {
    if (lifecycle === "created") {
      // Only emit create reminder for code files (not documentation, not KB docs)
      if (pathKind === "code") {
        lifecycleReminder = NEW_FILE_REMINDER;
        reminderKindsToMark.push("kibi_write");
      }
    } else if (lifecycle === "edited") {
      // No generic lifecycle reminder for edited files
      // Existing semantic risk guidance remains primary
    } else if (lifecycle === "deleted") {
      const ids = linkedEntityResult.ids;
      if (ids.length > 0) {
        lifecycleReminder = DELETED_WITH_IDS_REMINDER(ids.join(", "));
        reminderKindsToMark.push("kibi_delete");
      } else {
        lifecycleReminder = DELETED_NO_IDS_REMINDER;
        reminderKindsToMark.push("kibi_delete");
      }
    }
  }

  // Derive e2e reminder (only when e2e signal exists)
  // E2e reminders are NOT posture-gated - they're always relevant
  let e2eReminder: string | null = null;
  if (e2eSignal.level !== "none" && e2eSignal.reminderText !== null) {
    e2eReminder = e2eSignal.reminderText;
    if (lifecycle === "deleted") {
      reminderKindsToMark.push("e2e_delete");
    } else {
      reminderKindsToMark.push("e2e_write");
    }
  }

  return {
    lifecycleReminder,
    e2eReminder,
    reminderKindsToMark,
  };
}
