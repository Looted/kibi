---
title: 'CLI on a legacy KB: doctor and kb_status name kibi migrate --yes first, and a status-only upsert after migrate changes only the status line'
status: passing
priority: must
tags:
  - cli
  - migration
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-migrate-entity-type
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-migrate-entity-type
    target: default
    native_id: 'packages/cli/tests/commands/migrate-entity-type.test.ts::legacy entity files without a type line::a legacy KB: doctor and kb_status both name kibi migrate --yes first, migrate states the type, and a status-only upsert changes only the status line'
    source_file: packages/cli/tests/commands/migrate-entity-type.test.ts
    line: 88
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:41.235Z'
id: TEST-cli-legacy-kb-first-migrate
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3994cda3483320dbde8bb95a
    test_id: TEST-cli-legacy-kb-first-migrate
    scope: end_to_end
    outcome: passed
    code_snapshot: 05a890615d543a9b50938ec38f9103122cb02ef21f1056157bf81a4aeb38181a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:16:06.442Z'
    finished_at: '2026-10-28T11:16:13.792Z'
    artifact_digest: 035c2546018e4e153c0492438da2cac90220bb9020ae58e4c27d99cdd93da210
    contract_hash: 34a14051cd42eeb9b9723a20400b2a9355d7c47368e6e22cec9e89fe4e13e439
    binding_hash: fe02bfb6cab115c9841a07cf7dcadc57095a504296e8fee219b7ceb3a0c293bf
    fingerprint: ed4a0fb961d965c8f332439ac0e4ad630e6142fe7fbc955cde8f7f2aeb44e5ad
    fingerprint_components:
      contract: 34a14051cd42eeb9b9723a20400b2a9355d7c47368e6e22cec9e89fe4e13e439
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 2588a4fa62c4c41f33ee88d5d6c9cad1fe0d2ae23eabe66c27a412adce6807d4
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-cli-migrate-entity-type
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the CLI against a legacy KB (`.kb/config.json`, requirement files without `type`). It asserts that `kibi doctor` and `kb_status.bootstrap.nextAction` both name `kibi migrate --yes`, that migrate adds `type: req`, and that after a commit and sync a status-only `kb_upsert` changes exactly the `status` line in the Git diff.
