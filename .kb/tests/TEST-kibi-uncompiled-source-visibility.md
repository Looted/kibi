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
    receipt_id: PR-618eab5fc5bcf5ffaa53b06b
    test_id: TEST-kibi-uncompiled-source-visibility
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 5e792ee1ca632f23a4f93907b64712b5b3ac5feb899ccc02d704345755f0d55f
    binding_hash: 36a94ee798dfd506a6b1a2ffe4a914abd8c07f4d1ec39e7396d3dc81af8eff76
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
