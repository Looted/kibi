---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

Write-path fixes for `kb_record` and `kb_upsert`:

- The `claim-subject-missing` step a requirement write returns is accepted as it comes once its `<subject_key>` is filled in. It now sends partial inventory entries (`{claim_key, status, subjects}`), so a title that is itself a rule (as `kb_record` writes it) no longer moves the ledger off the statement or drops a second claim. Partial entries are always completed from the requirement's prose, and full entries that are valid over the stored `semantic_text` are written with it.
- A requirement update with a new `document.body` that states something else now records that statement as `semantic_text`, so the claims Kibi checks no longer stay on the old statement.
- The warning that a requirement "was written without a semantic inventory that matches its statement" counts the write's relationships, which live in the relationship shards, so a modeled claim with its `requires_property` link no longer triggers it.
- `kb_record` succeeds when the commit-gate verdict fails after the write (a workspace without git, for example): it returns the write with `verdictError` instead of a retryable error, so a retry no longer records the rule again as `-2`.
- `kb_record` takes the next `-N` id when a requirement file with its derived id exists but sync has not compiled it, instead of overwriting that file. A derived id keeps at most 80 characters of the statement's words.
- `kb_upsert` refuses an id made only of dots, or longer than 200 bytes, with `VALIDATION_FAILED`.
