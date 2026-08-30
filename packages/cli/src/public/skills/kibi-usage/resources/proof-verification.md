# Proof and Verification Workflow

Use this resource when a requirement must be proven before handoff, when
wiring a test to end-to-end evidence, or when a `kb_ingest_verification` call
was rejected.

## Golden path

1. Query the test (`kb_query`, `type: test`) and read its
   `verification_contract.v1` and `verification_scope`.
2. Run the exact contracted command:

   ```bash
   kibi verify --test-id TEST-<id> -- <argv equal to contract.command_argv>
   ```

   The command captures the workspace snapshot, runs the child with
   `shell: false`, reads the reporter artifact, and ingests the receipt.
3. Confirm with `kb_status` (fresh, current snapshot) and `kb_coverage`.

Never hand-write receipts. Kibi derives them from reporter artifacts only.

## Artifact shape (kibi.playwright-run.v1)

Produce artifacts with the bundled Playwright reporter
(`kibi-cli/playwright-reporter`). Each entry in `artifact.cases` requires:

- `symbol_id`: stable case symbol (`SYM-*`) derived from source file + title
- `project`: Playwright project name
- `outcome`: one of `passed`, `failed`, `timed_out`, `skipped`, `interrupted`
- `retries`: non-negative integer (proof requires `0`)
- `duration_ms`: non-negative integer

Top level requires `version` (`kibi.playwright-run.v1`), `runner`,
`command_argv`, `code_snapshot` (64-hex snapshot captured before the run),
`environment_hash` (64-hex), `started_at`, `finished_at`,
`process_exit_code`, and `cases`. Proof requires exit code `0` and every case
`passed` on the first attempt.

Note the vocabulary split: artifact case outcomes are the five literals above;
derived receipts may additionally report `errored` or `cancelled`.

## Common rejections

- `outcome must be one of: ...` — a Playwright-native status like `"passed"`
  was placed in a `status` field; use `outcome` with the allowed literals.
- `captured snapshot is not the live workspace snapshot` — the tree changed
  between capture and ingest; re-run `kibi verify`.
- `command_argv does not match verification contract` — run the exact
  contracted command, argument for argument.
- `missing required case <project>/<symbol>` — the required case did not run
  in the required project, or its title-derived `symbol_id` drifted.
- `verification_receipts is append-only` — receipts are append-only; update
  tests through the engine (which appends) or include the existing receipt
  history when authoring test files directly.

## After code changes

Receipts bind to the snapshot at run time. Any code or source change moves
the snapshot and stales every receipt: re-run `kibi verify` for each
contracted test, then confirm `kb_status` and `kb_coverage` before handoff.

Full reference: `docs/proving-requirements.md`.
