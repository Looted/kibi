# Proving Requirements

This guide explains how to take a requirement from "implemented" to "proven":
fresh end-to-end evidence, bound to the current code snapshot, attached to a
contracted test, and accepted by Kibi's append-only receipt history.

Read this if you are:

- a developer wiring a `TEST-*` entity to real end-to-end tests,
- an agent asked to make a requirement "proven" before handoff, or
- an integration author producing `kibi.playwright-run.v1` artifacts directly.

## The proof chain

Kibi proof follows the canonical traceability chain:

```
REQ-* --specified_by--> SCEN-* --verified_by--> TEST-* <--executable_for-- SYM-* (case)
                                                  ^----covered_by---- SYM-* (production)
```

A requirement counts as **proven** only when its contracted test has a passing
verification receipt that is:

- bound to the **current workspace snapshot** (the snapshot captured
  immediately before the run),
- derived from a reporter artifact (never caller-authored),
- the newest valid receipt within the 7-day freshness window, and
- compliant with the test's `verification_contract`.

## The golden path: `kibi verify`

Prefer the single-command flow. It captures the snapshot, runs your exact
contracted command, reads the reporter artifact, and ingests the receipt:

```bash
kibi verify --test-id TEST-checkout -- pnpm exec playwright test --project=chromium
```

Rules that make this work:

1. **Author the contract on the test.** A `TEST-*` entity with
   `verification_scope` and a `verification_contract.v1`:

   ```yaml
   verification_scope: end_to_end        # unit | integration | end_to_end
   verification_perspective: consumer    # internal | consumer
   verification_contract:
     version: kibi.verification-contract.v1
     runner: node
     command_argv:
       - node
       - scripts/run-proof-contract.mjs
       - --test-id
       - TEST-checkout
     required_case_symbols:
       - SYM-e2e-packed-checkout
     required_projects:
       - default
     success_policy: all_required_cases_first_attempt
   ```

2. **Match the contract exactly.** The argv after `--` must equal
   `command_argv` argument-for-argument. The child runs with `shell: false`.

3. **Use the bundled reporter.** Register `kibi-cli/playwright-reporter` in
   your Playwright config. `kibi verify` sets `KIBI_VERIFICATION_OUTPUT`,
   `KIBI_VERIFICATION_SNAPSHOT`, and `KIBI_VERIFICATION_COMMAND_ARGV` for the
   child process; the reporter turns them into the artifact.

4. **Derive stable case symbols.** The reporter computes each case's
   `symbol_id` from the normalized source file plus the full test title path.
   Keep titles stable; create the matching `SYM-*` case entity and link it
   with `executable_for` to the test. Link production symbols with
   `covered_by`.

5. **Cover required cases and projects.** Every
   `required_case_symbols` × `required_projects` pair must appear exactly once
   in `artifact.cases`.

6. **Confirm the proof.** Run `kibi status` (fresh KB, current snapshot),
   then `kibi coverage` or `kibi report` and check the requirement shows a
   passing receipt bound to the current snapshot.

## Artifact reference: `kibi.playwright-run.v1`

Most consumers never hand-write this artifact — the reporter produces it and
`kibi verify` ingests it. Direct `kb_ingest_verification` calls are an
integration path for custom runners and agents.

```json
{
  "version": "kibi.playwright-run.v1",
  "runner": "playwright",
  "command_argv": ["node", "scripts/run-proof-contract.mjs", "--test-id", "TEST-checkout"],
  "code_snapshot": "<64-hex workspace snapshot captured before the run>",
  "environment_hash": "<64-hex environment digest>",
  "started_at": "2026-08-29T12:00:00.000Z",
  "finished_at": "2026-08-29T12:01:23.456Z",
  "process_exit_code": 0,
  "cases": [
    {
      "symbol_id": "SYM-e2e-packed-checkout",
      "project": "default",
      "outcome": "passed",
      "retries": 0,
      "duration_ms": 2415
    }
  ]
}
```

Field contract:

| Field | Requirement |
| --- | --- |
| `version` | Literal `kibi.playwright-run.v1` |
| `runner` | Non-empty string; must equal the contract's `runner` |
| `command_argv` | Non-empty string array; must equal the contract's `command_argv` |
| `code_snapshot` | 64-hex; must equal the live snapshot captured before the run |
| `environment_hash` | 64-hex digest of the runtime environment |
| `started_at` / `finished_at` | Non-empty ISO timestamps |
| `process_exit_code` | Integer; `0` is required for a passing proof |
| `cases` | 1–1000 case results, each shaped as below |

Each entry in `cases` requires exactly these fields:

| Field | Requirement |
| --- | --- |
| `symbol_id` | Non-empty stable case symbol (`SYM-*`) |
| `project` | Non-empty Playwright project name |
| `outcome` | One of: `passed`, `failed`, `timed_out`, `skipped`, `interrupted` |
| `retries` | Non-negative integer; a passing proof requires `0` |
| `duration_ms` | Non-negative integer |

Case outcome vocabulary (input) is intentionally narrower than the receipt
schema's outcome vocabulary (which additionally allows `errored`, `cancelled`
for derived receipt outcomes). Proof requires every case `passed` with
`retries: 0` and exit code `0`.

Worked examples live in
[docs/examples/verification](examples/verification/) and are validated against
the schema in CI.

## Multi-step contracts

A contract has exactly one command. To prove a requirement that needs several
suites, wrap the steps in one script (see `scripts/run-proof-contract.mjs` and
`proof/verification-registry.json` in this repository) and make that script
the contracted command. The script must run Playwright (or otherwise emit the
reporter artifact) as its final evidence-producing step, and the artifact's
`command_argv` must be the contracted script invocation.

## Common failures and fixes

| Error | Cause | Fix |
| --- | --- | --- |
| `unsupported case outcome` / `outcome must be one of: ...` | Case used a Playwright-native status like `passed` in a `status` field, or an unknown value | Emit `outcome` with one of the five allowed literals above |
| `cases[N] must be an object with symbol_id, project, ...` | Case missing required fields | Emit all five fields per case |
| `artifact.version must be kibi.playwright-run.v1` | Wrong or missing artifact version | Use the bundled reporter |
| `captured snapshot is not the live workspace snapshot` | Files changed between capture and ingest | Re-run `kibi verify`; do not edit the tree between capture and ingest |
| `reporter command_argv does not match verification contract` | Command drift | Run the exact contracted command after `--` |
| `missing required case <project>/<symbol>` | Reporter did not emit a required case | Ensure the case ran in the required project and its title-derived `symbol_id` matches |
| `verification_receipts is append-only` (when authoring tests) | Receipt history cannot be removed or rewritten | Include the existing receipts array when updating a test, or update via the engine which appends instead of replaces |
| Receipts stale after code changes | Receipts bind to the snapshot at run time | Re-run `kibi verify` for every contracted test after the tree changes |

## For agent workflows

Bundled skill guidance is in
`kibi-usage` → `resources/proof-verification.md`
(`kb_skills_load` with `id: "kibi-usage"`, then `kb_skills_read`).
