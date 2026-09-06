/** Test-only casts for leftover coverage files. Do not use in production. */

export type LooseApplyPlan = {
  outcome?: string;
  planHash?: string;
  changedPaths?: readonly string[];
  changedEntities?: number;
  changedRelationships?: number;
  recoveryJournalId?: string | null;
  status?: string;
  effectFailures?: readonly Record<string, unknown>[];
  nextActions?: readonly Record<string, unknown>[];
  actionResults?: readonly {
    actionId?: string;
    outcome?: string;
    detail?: string;
  }[];
  closeout?: {
    taskOutcome?: string;
    kbState?: string;
    snapshotState?: string;
  };
};

export function asApply(value: unknown): LooseApplyPlan {
  return value as LooseApplyPlan;
}

export function asQueryResult(value: {
  success: boolean;
  bindings?: Record<string, string | undefined>;
  error?: string;
}): { success: boolean; bindings: Record<string, string>; error?: string } {
  return value as {
    success: boolean;
    bindings: Record<string, string>;
    error?: string;
  };
}

export function asNever<T>(value: T): never {
  return value as never;
}
