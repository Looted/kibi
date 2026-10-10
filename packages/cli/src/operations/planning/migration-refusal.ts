/**
 * A migration action executor throws this when it refuses to run: a
 * precondition failed before it changed anything (the planned file already
 * exists, a source changed since planning, the action is malformed). An
 * application whose only failures are refusals and that applied nothing
 * reports `outcome: "refused"`, not `reconciliation_required`: there is
 * nothing to reconcile.
 */
// implements REQ-kibi-change-to-proof-plan-compiler-v2
export class MigrationActionRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationActionRefusedError";
  }
}

/** Error code of the envelope for a migration plan that was refused. */
export const MIGRATION_PLAN_REFUSED = "MIGRATION_PLAN_REFUSED" as const;
