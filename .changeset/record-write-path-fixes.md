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
- `kb_upsert` refuses a write into an existing Markdown document without an `id` (sync derives that entity's id from its path and title) with `SOURCE_ENTITY_MISMATCH`, unless the store already reads the written entity from that file. Before, the other entity was replaced and dropped at the next sync.
- On MCP, a refused write (a contradiction, an unsafe id, a missing endpoint, a firm decision) now answers with the same `OPERATION_FAILED` error envelope as the CLI JSON route, with `retryable: false`, instead of plain text.
- The KB merge action fails when it cannot list the open pull requests (a token without `pull-requests: read`) instead of passing with nothing to do; a push refused for another reason than a moved branch is reported with git's error and not retried; and repeated runs in one clone no longer append duplicate lines to `.git/info/attributes`.
- `kibi prove --requirement` also selects the tests the requirement links with `verified_by`, which is how `kb_record` links a test; before, such a test was proved only with `--test`.
