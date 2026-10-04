---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
---

`kb_apply_plan` now applies a compile plan all-or-nothing. If any step fails, including a step after the first, the store and the workspace are left as they were and the same plan can be applied again; you no longer get a half-applied plan that needs manual repair. If the process dies mid-application, the next `kb_apply_plan`, `kb_upsert` or `kb_delete` call completes or rolls back the interrupted plan from its journal and reports which. `kb_upsert` with `dryRun: true` now runs exactly the validation a real write runs (including strict-lane pairing and supersedes direction, which it used to skip), so it rejects what the write would reject.

- Compile plans write a durable journal before the first write: `plan-apply-<planHash[0:16]>.json` in the branch store directory, or `.kb/recovery/plan-apply/<branchKey>/` until the store manifest exists. It records the plan hash, exact before/after bytes and hashes of every workspace file the plan changes (its `sourceWrites` plus the relationship shards its steps append, rendered in memory by the new `renderShardWithRelationship`), every store upsert, and a fingerprint of the touched store entities. Plans without source writes are journaled too.
- Files publish with temp-file + fsync + rename + directory fsync (`FilesystemPort.fsync` is new and optional; `nodeFilesystem` implements it). All steps then commit in one `kb_commit_upsert_batch` transaction, which is the only commit point. Steps no longer run one by one through `executeUpsert`.
- Any failure before the commit restores every file from the journal and aborts. Error text says `no change was applied`, and the journal ends `rolled_back`. A commit failure is decided from the store fingerprint, not the transport. A store that reports failure but shows the batch committed returns `committed_with_repairs` with `STORE_COMMIT_REPORTED_FAILURE`. A store that cannot be inspected keeps the journal and throws the new non-retryable `PLAN_APPLY_RECOVERY_REQUIRED`.
- Recovery runs at the start of `kb_apply_plan`, and of `kb_upsert`/`kb_delete` when they take the workspace mutation lock. It also runs through `kb_apply_plan` `recoveryJournalId: "plan-apply-…"`. Journal states:
  - `prepared`: rolled back.
  - `store_committing`: decided by the fingerprint.
  - `store_committed`: completed.
  - `committed` / `rolled_back`: idempotent no-op.

  Results report `outcome: "replayed" | "rolled_back"` and `validationSummary.recoveredJournals`; upsert warnings and delete text also report the recovery, and a call that settles a journal and then fails on its own work appends `[settled before this failure: …]` to its error text (typed errors keep their code and retryability). Before changing anything, recovery checks that every journaled file is at its before or after hash. Otherwise it changes nothing and throws `PARTIAL_COMMIT_REPAIR_REQUIRED`. The journalless `PARTIAL_COMMIT_REPAIR_REQUIRED` path for compile plans is gone.
- A pending-source receipt failure after the commit now returns `committed_with_repairs` (`PENDING_SOURCE_RECEIPT_FAILED`) instead of throwing `SOURCE_COMMIT_REPAIR_REQUIRED`. Later writes fail with `PLAN_APPLY_RECOVERY_REQUIRED` until the journal is recovered.
- Behavior change: `executeValidateUpsert` (`kb_upsert` `dryRun: true`, CLI `validate-upsert`) uses `validateUpsertForCommit` whenever a store is attached. The response shape is unchanged. The dry run now reads the store for existing relationships, strict-lane pairing and supersedes history. Without a store it keeps the store-independent checks.
- Entity-deletion and bootstrap plans keep their existing journals.
