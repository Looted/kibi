---
title: CLI migrate maps delivered legacy statuses, records them in the audit and reports requirements left uncompiled
status: passing
priority: must
tags:
  - migration
  - requirement-status
  - cli
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-migrate-legacy-requirement-status
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-migrate-legacy-requirement-status
    target: default
    native_id: packages/cli/tests/commands/migrate-legacy-status.test.ts::legacy requirement statuses and uncompiled sources::kibi migrate --yes maps a delivered status to closed with the tag implemented, and sync compiles it
    source_file: packages/cli/tests/commands/migrate-legacy-status.test.ts
    line: 141
origin:
  kind: agent
  recorded_at: '2026-10-14T08:56:47.242Z'
id: TEST-cli-migrate-legacy-requirement-status
type: test
---
Runs the CLI on a temporary legacy workspace: a dry run lists the mapping, `kibi migrate --yes` maps `implemented` and `done` to `closed` with the tag `implemented` and records `legacyStatusesMapped` in the audit, and `kibi sync` compiles the requirements so `kibi query` returns them. A store whose first sync ran before the mapping keeps the legacy baseline, and an unknown status leaves the run reporting `Migration incomplete` with the requirement and its fix. Unit tests cover the status plan, the single automatic plan action and the in-place front matter rewrite.
