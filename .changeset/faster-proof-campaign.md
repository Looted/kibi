---
"kibi-cli": minor
"kibi-core": patch
---

A full proof campaign spends much less time repeating the same packed test and rewriting the knowledge base once per receipt. Contracts that declare the identical command now share one execution, and the receipt campaign commits in batches instead of flushing the journal after every test. Selecting which tests to prove no longer loads every receipt history up front.

Receipt source documents stay protected through the batched commit, and a failed batch restores every uncommitted document while preserving earlier committed batches.

- Run each distinct proof-step command once and record that attempt on every contract that declared it.
- Honor `KIBI_PROOF_STEP_CONCURRENCY` (default 1) when distinct commands can run together.
- Reuse one snapshot-keyed compilation of the packed end-to-end suite across proof steps.
- Commit proof-receipt upserts with `kb_commit_upsert_batch/2`, one transaction and one journal flush per batch of 25.
- Select proof campaigns in bounded pages containing only test ids, contracts, and bindings; receipt histories remain unloaded.
- Hold the workspace source lock through receipt publication and batched Prolog commits, and restore every uncommitted receipt source on failure.
