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
    receipt_id: PR-254d24c99890e5969d1220bc
    test_id: TEST-cli-legacy-kb-first-migrate
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 34a14051cd42eeb9b9723a20400b2a9355d7c47368e6e22cec9e89fe4e13e439
    binding_hash: 77689f067fe413ffc616dc1c13ee4a8f7cf883bab61de925ddbd49906725f4b5
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
