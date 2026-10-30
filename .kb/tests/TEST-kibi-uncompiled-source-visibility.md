---
title: CLI reports uncompiled authored files in kb_check and kb_status and judges kb_upsert against the authored file
status: passing
priority: must
tags:
  - sync
  - upsert
  - status
  - check
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
    native_id: packages/cli/tests/commands/migrate-legacy-status.test.ts::legacy requirement statuses and uncompiled sources::kb_upsert on an uncompiled requirement file is judged against that file and refused before writing
    source_file: packages/cli/tests/commands/migrate-legacy-status.test.ts
    line: 291
origin:
  kind: agent
  recorded_at: '2026-10-14T08:56:48.892Z'
id: TEST-kibi-uncompiled-source-visibility
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9004806592c54918289b431a
    test_id: TEST-kibi-uncompiled-source-visibility
    scope: end_to_end
    outcome: passed
    code_snapshot: 8419f49189cfc4ef7df7e024a4c0d50ffad1735007fca08087b29bdb21784ccf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:08:47.421Z'
    finished_at: '2026-10-28T19:09:15.865Z'
    artifact_digest: 6327bae7ea7b5d8136bea08e3f57998415e1b422ed455f65a0fcafeb2f50c8d1
    contract_hash: 5e792ee1ca632f23a4f93907b64712b5b3ac5feb899ccc02d704345755f0d55f
    binding_hash: 9c4630049bcaaf243e78c4385a559da30e27924c3b597a45cc0654cc3fe088e0
    fingerprint: 68cdd3045f4933ee78981f5f3919ab971135f6ed555307531d2094121032fd8e
    fingerprint_components:
      contract: 5e792ee1ca632f23a4f93907b64712b5b3ac5feb899ccc02d704345755f0d55f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: effd742bda71ddb570b1bfd32e589e3b3b17f5a4260f810212b093dec3fe34b4
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
Runs the CLI on a temporary workspace with a requirement file that sync cannot extract: `kibi check` reports the file and its extraction error as a blocking violation and `kibi status` reports it stale until the file is fixed. An upsert that only closes a requirement with pinned `semantic_text` and no inventory is refused with the proposition-complete message and leaves the file unchanged, an upsert that would keep the file uncompilable is refused naming the file, and an upsert that repairs an uncompiled ADR updates it in place and keeps its origin. Unit tests cover the extraction failure record, the status reasons and the authored-file lookup.
