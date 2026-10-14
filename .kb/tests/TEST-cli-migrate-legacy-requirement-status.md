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
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-865d21d9e0b7709ecc17d217
    test_id: TEST-cli-migrate-legacy-requirement-status
    scope: end_to_end
    outcome: passed
    code_snapshot: bfda05f172480564af2a87e3a04ce34f85ceb1530759e633da450cbf50bfe3f5
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-14T10:32:59.333Z'
    finished_at: '2026-10-14T10:33:16.123Z'
    artifact_digest: 82749eb43b6796dfaa35fc913549d36e51bcb5048bdfafbc3d0d4ee556a3daf1
    contract_hash: 5e792ee1ca632f23a4f93907b64712b5b3ac5feb899ccc02d704345755f0d55f
    binding_hash: e2feccf9b65570db91cbedf605c68285cdd7e091d463b97e50a97f6e782fd980
    fingerprint: 23be39ba2ea43dbb463b4d08812c1dbe4645c58d330275e312fd5a37e3489463
    fingerprint_components:
      contract: 5e792ee1ca632f23a4f93907b64712b5b3ac5feb899ccc02d704345755f0d55f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 26722dc388cf6729f623a3fffff89d9d5c9ab7c5b33fd9ddfccf61b4ae02e64f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-cli-migrate-legacy-requirement-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the CLI on a temporary legacy workspace: a dry run lists the mapping, `kibi migrate --yes` maps `implemented` and `done` to `closed` with the tag `implemented` and records `legacyStatusesMapped` in the audit, and `kibi sync` compiles the requirements so `kibi query` returns them. A store whose first sync ran before the mapping keeps the legacy baseline, and an unknown status leaves the run reporting `Migration incomplete` with the requirement and its fix. Unit tests cover the status plan, the single automatic plan action and the in-place front matter rewrite.
