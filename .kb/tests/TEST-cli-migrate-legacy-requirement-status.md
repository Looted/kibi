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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-31918b2cdaf178a2ad0c1865
    test_id: TEST-cli-migrate-legacy-requirement-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 6c5b25823ef6cbf009fe70ee8955458c0021056cbc5b1d725647c41af19ef199
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:43:52.095Z'
    finished_at: '2026-10-28T17:44:21.365Z'
    artifact_digest: 558f87695e07b892ff20355f418ffe2cb297a2bf408f79bd06e5f762b1cf8283
    contract_hash: 5e792ee1ca632f23a4f93907b64712b5b3ac5feb899ccc02d704345755f0d55f
    binding_hash: efb17b32d3018bf4eaeaeb9a3aa0d2d20aba3073af63200ec2d48d1865b97bbf
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
    kind: e2e
    evidence_level: tested
---
Runs the CLI on a temporary legacy workspace: a dry run lists the mapping, `kibi migrate --yes` maps `implemented` and `done` to `closed` with the tag `implemented` and records `legacyStatusesMapped` in the audit, and `kibi sync` compiles the requirements so `kibi query` returns them. A store whose first sync ran before the mapping keeps the legacy baseline, and an unknown status leaves the run reporting `Migration incomplete` with the requirement and its fix. Unit tests cover the status plan, the single automatic plan action and the in-place front matter rewrite.
