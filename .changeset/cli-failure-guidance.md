---
"kibi-cli": minor
---

Clearer CLI failures, found through anonymous usage telemetry:

- Every JSON-only command (`plan-bootstrap`, `upsert`, `apply-plan`, …) takes `--schema`, which prints the JSON Schema its `--input` is validated against, with every field and its allowed values. A `VALIDATION_FAILED` input error points at it, and a command run without `--input` now says how to pass the document (`echo '{}' | kibi plan-bootstrap --input -`).
- A reader that closes stdout early (`kibi query req | head`) no longer crashes the CLI with `write EPIPE`; the command exits with its own exit code.
- `kibi sync` refusing a hand-edited `.kb/` file that `kb_upsert` wrote and Git does not track yet (`Pending source hash drift`) now names the way out: stage the file with `git add` to keep the edit, or write it through `kb_upsert`. Before, the message gave no fix, and `kibi branch recover --apply`, the fix named for a deleted pending source, failed with the same error.
- `kibi proof explain` with an id the branch KB does not hold, or holds as another type, says so and suggests `kibi sync`, instead of `Proof explain query failed: Query failed`.

Technical summary: sync refusals are `SyncError`s with a `code` (`PENDING_SOURCE_HASH_DRIFT`, `PENDING_SOURCE_MISSING`, `PENDING_SOURCE_ESCAPES_WORKSPACE`, `PENDING_SOURCE_RECEIPT_CHANGED`, `PENDING_SOURCE_RECEIPT_IO`, `SOURCE_ANALYZER_UNAVAILABLE`, `SYMBOLS_MANIFEST_INVALID`, `COORDINATE_ARTIFACT_INVALID`), engine start failures carry `ENGINE_START_FAILED`, `proof explain` throws `INVALID_TARGET` / `ENTITY_NOT_FOUND` / `PROLOG_UNAVAILABLE`, and `prove` throws `PROOF_INTEGRATIONS_UNAVAILABLE` / `WORKSPACE_SNAPSHOT_UNAVAILABLE`, so usage telemetry records a stable category instead of `uncaught_error`. A missing `--input` records `MISSING_INPUT`. A non-zero exit that is the command's own answer records an outcome category: `check_violations` (`check`, `check-diff`), `generated_artifacts_stale` (`check-generated`), `tests_failed` (`prove`, `proof run-steps`) and `integration_failed` (`prove` when an integration produced no receipts). `main()` treats `EPIPE`/`ERR_STREAM_DESTROYED` on stdout as a closed reader.
