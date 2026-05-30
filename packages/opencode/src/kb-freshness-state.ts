/**
 * KB freshness state machine, evidence model, and in-memory evidence store.
 *
 * This is Wave 1 — the foundation module. No MCP tools, no filesystem or
 * `.kb/` persistence, no entity mutation. Pure in-memory state.
 *
 * @module kb-freshness-state
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KbFreshnessDecision =
  | "updated"
  | "no-impact"
  | "deferred"
  | "failed";

export type KbFreshnessStateKind =
  | "clean"
  | "unknown-impact"
  | "evidence-required"
  | "updated"
  | "no-impact-accepted"
  | "deferred"
  | "check-failed";

export interface KbFreshnessEvidence {
  sessionId?: string;
  agentIdentity: string;
  worktree: string;
  branch: string;
  fingerprint: string;
  changedFiles: string[];
  kbStatus: boolean;
  sourceLinkedDiscovery: boolean;
  kbMutation: boolean;
  kbCheck: boolean;
  decision?: KbFreshnessDecision;
  rationale?: string;
  checkRules?: string[];
}

export interface KbFreshnessEvaluation {
  state: KbFreshnessStateKind;
  requiresEvidence: boolean;
  allowsCompletion: boolean;
  reason: string;
  missingEvidence: string[];
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate KB freshness from collected evidence.
 *
 * Rules (in priority order):
 * 1. No changed files → `clean`, allows completion.
 * 2. Changed files but no decision → `evidence-required`, blocks completion.
 * 3. `updated` → requires `kbMutation` + `kbCheck`.
 * 4. `no-impact` → requires `rationale` + `sourceLinkedDiscovery` + `kbCheck`.
 * 5. `deferred` → blocks completion.
 * 6. `failed` → `check-failed`, blocks completion.
 */
export function evaluateKbFreshness(
  evidence: KbFreshnessEvidence,
): KbFreshnessEvaluation {
  // Rule 1: No changed files
  if (evidence.changedFiles.length === 0) {
    return {
      state: "clean",
      requiresEvidence: false,
      allowsCompletion: true,
      reason: "No files changed",
      missingEvidence: [],
    };
  }

  // Rule 2: No decision recorded yet
  if (evidence.decision === undefined) {
    return {
      state: "evidence-required",
      requiresEvidence: true,
      allowsCompletion: false,
      reason: "Session modified files without KB tool evidence",
      missingEvidence: [],
    };
  }

  // Rule 5: Deferred
  if (evidence.decision === "deferred") {
    return {
      state: "deferred",
      requiresEvidence: false,
      allowsCompletion: false,
      reason: "KB freshness check was explicitly deferred",
      missingEvidence: [],
    };
  }

  // Rule 6: Failed
  if (evidence.decision === "failed") {
    return {
      state: "check-failed",
      requiresEvidence: false,
      allowsCompletion: false,
      reason: "KB freshness check failed",
      missingEvidence: [],
    };
  }

  // Rule 3: Updated
  if (evidence.decision === "updated") {
    const missingEvidence: string[] = [];

    if (!evidence.kbMutation) {
      missingEvidence.push("kbMutation");
    }
    if (!evidence.kbCheck) {
      missingEvidence.push("kbCheck");
    }

    if (missingEvidence.length > 0) {
      return {
        state: "evidence-required",
        requiresEvidence: true,
        allowsCompletion: false,
        reason:
          "KB was updated but required evidence (kbMutation, kbCheck) is missing",
        missingEvidence,
      };
    }

    return {
      state: "updated",
      requiresEvidence: false,
      allowsCompletion: true,
      reason: "KB updated and verified via kb_check",
      missingEvidence: [],
    };
  }

  // Rule 4: No-impact
  if (evidence.decision === "no-impact") {
    const missingEvidence: string[] = [];

    if (!evidence.rationale || evidence.rationale === "") {
      missingEvidence.push("rationale");
    }
    if (!evidence.sourceLinkedDiscovery) {
      missingEvidence.push("sourceLinkedDiscovery");
    }
    if (!evidence.kbCheck) {
      missingEvidence.push("kbCheck");
    }

    if (missingEvidence.length > 0) {
      return {
        state: "evidence-required",
        requiresEvidence: true,
        allowsCompletion: false,
        reason:
          "No-impact claim needs rationale, sourceLinkedDiscovery, and kbCheck",
        missingEvidence,
      };
    }

    return {
      state: "no-impact-accepted",
      requiresEvidence: false,
      allowsCompletion: true,
      reason: "No-impact accepted with rationale and KB check passed",
      missingEvidence: [],
    };
  }

  // Exhaustive guard — all decision branches handled above
  const _exhaustive: never = evidence.decision;
  throw new Error(`Unexpected decision: ${_exhaustive}`);
}

// ---------------------------------------------------------------------------
// Scope & Store
// ---------------------------------------------------------------------------

export interface KbFreshnessScope {
  sessionId?: string;
  agentIdentity: string;
  worktree: string;
  branch: string;
  fingerprint: string;
}

interface ScopeEvidence {
  kbStatus: boolean;
  sourceLinkedDiscovery: boolean;
  kbMutation: boolean;
  kbCheck: boolean;
  decision?: KbFreshnessDecision;
  rationale?: string;
  checkRules?: string[];
}

type ToolName = string;

/**
 * Map of tool names → evidence side effects.
 * Each entry lists the evidence fields to set when that tool is used.
 */
const TOOL_EFFECTS: Record<string, Array<keyof ScopeEvidence>> = {
  kb_status: ["kbStatus"],
  kb_search: ["sourceLinkedDiscovery"],
  kb_query: ["sourceLinkedDiscovery"],
  kb_graph: ["sourceLinkedDiscovery"],
  kb_find_gaps: ["sourceLinkedDiscovery"],
  kb_coverage: ["sourceLinkedDiscovery"],
  kb_upsert: ["kbMutation"],
  kb_delete: ["kbMutation"],
  kb_check: ["kbCheck"],
};

export interface KbFreshnessEvidenceStore {
  recordToolEvidence(scope: KbFreshnessScope, toolName: string): void;
  recordNoImpact(scope: KbFreshnessScope, rationale: string): void;
  getEvidence(
    scope: KbFreshnessScope,
    changedFiles: string[],
  ): KbFreshnessEvidence;
  resetScope(scope: KbFreshnessScope): void;
}

function buildScopeKey(scope: KbFreshnessScope): string {
  const parts = [
    scope.sessionId ?? "",
    scope.agentIdentity,
    scope.worktree,
    scope.branch,
    scope.fingerprint,
  ];
  return parts.join("|");
}

/**
 * Create an in-memory evidence store scoped by
 * (sessionId | agentIdentity | worktree | branch | fingerprint).
 */
export function createKbFreshnessEvidenceStore(): KbFreshnessEvidenceStore {
  const store = new Map<string, ScopeEvidence>();

  function getOrCreate(scope: KbFreshnessScope): ScopeEvidence {
    const key = buildScopeKey(scope);
    if (!store.has(key)) {
      store.set(key, {
        kbStatus: false,
        sourceLinkedDiscovery: false,
        kbMutation: false,
        kbCheck: false,
      });
    }
    return store.get(key) as ScopeEvidence;
  }

  return {
    recordToolEvidence(scope: KbFreshnessScope, toolName: string): void {
      const record = getOrCreate(scope);
      const effects = TOOL_EFFECTS[toolName];

      if (!effects) {
        return;
      }

      for (const field of effects) {
        if (field === "kbMutation") {
          record.kbMutation = true;
          record.decision = "updated";
        } else {
          (record as unknown as Record<string, boolean>)[field] = true;
        }
      }
    },

    recordNoImpact(scope: KbFreshnessScope, rationale: string): void {
      const record = getOrCreate(scope);
      record.decision = "no-impact";
      record.rationale = rationale;
    },

    getEvidence(
      scope: KbFreshnessScope,
      changedFiles: string[],
    ): KbFreshnessEvidence {
      const record = getOrCreate(scope);

      return {
        ...(scope.sessionId ? { sessionId: scope.sessionId } : {}),
        agentIdentity: scope.agentIdentity,
        worktree: scope.worktree,
        branch: scope.branch,
        fingerprint: scope.fingerprint,
        changedFiles,
        kbStatus: record.kbStatus,
        sourceLinkedDiscovery: record.sourceLinkedDiscovery,
        kbMutation: record.kbMutation,
        kbCheck: record.kbCheck,
        ...(record.decision !== undefined ? { decision: record.decision } : {}),
        ...(record.rationale !== undefined
          ? { rationale: record.rationale }
          : {}),
        ...(record.checkRules !== undefined
          ? { checkRules: record.checkRules }
          : {}),
      };
    },

    resetScope(scope: KbFreshnessScope): void {
      const key = buildScopeKey(scope);
      store.delete(key);
    },
  };
}
