/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Declared compensation list for multi-surface mutations.
 *
 * An upsert touches authored sources, relationship shards, generated
 * coordinate artifacts, and the compiled KB — in that order — and a failed
 * attempt must undo them in reverse order without masking the original
 * failure. Instead of tracking rollback state in scattered locals, steps
 * register a named rollback as they succeed; one rollback() call walks the
 * list backwards exactly once.
 */

// implements REQ-014
export type SagaStep = Readonly<{
  /** Stable identifier used in rollback diagnostics. */
  name: string;
  /**
   * Undo the step. Implementations should target idempotence (guards against
   * concurrent writers, tolerating an already-restored surface); rollback()
   * never re-throws a rollback error.
   */
  rollback: () => void | Promise<void>;
  /**
   * `swallow` (default): preserve the original mutation failure; the recovery
   * journal / next check reconciles. `capture`: report the rollback failure
   * alongside the original error (e.g. as an AggregateError).
   */
  onError?: "swallow" | "capture";
}>;

// implements REQ-014
export type SagaRollbackFailure = Readonly<{
  step: string;
  error: unknown;
}>;

// implements REQ-014
export class MutationSaga {
  private readonly steps: SagaStep[] = [];
  private rollbackCompleted = false;
  private committedAt: number | null = null;

  /** Register a completed step. Call only after the step fully succeeded. */
  // implements REQ-014
  add(step: SagaStep): void {
    this.steps.push(step);
  }

  /**
   * The durable commit point: once marked, rollback() is a no-op — the
   * compiled KB holds the change and post-commit failures surface as
   * committed-with-repairs results instead of undoing committed state.
   */
  // implements REQ-014
  markCommitted(): void {
    this.committedAt = this.steps.length;
  }

  // implements REQ-014
  get committed(): boolean {
    return this.committedAt !== null;
  }

  /**
   * Roll back every registered step in reverse order, exactly once. Rollback
   * errors never throw; capture-policy failures are returned so the caller
   * can decide whether to aggregate them into the propagated error.
   */
  // implements REQ-014
  async rollback(): Promise<readonly SagaRollbackFailure[]> {
    if (this.rollbackCompleted || this.committedAt !== null) return [];
    this.rollbackCompleted = true;
    const captured: SagaRollbackFailure[] = [];
    for (const step of [...this.steps].reverse()) {
      try {
        await step.rollback();
      } catch (error) {
        if (step.onError === "capture") {
          captured.push({ step: step.name, error });
        }
        // Swallow-policy failures keep the original mutation error intact;
        // the recovery journal and the next check/sync report what could not
        // be restored.
      }
    }
    return captured;
  }
}
