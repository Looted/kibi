---
id: TEST-011
title: pre-commit hook blocks commit on coverage violation
status: active
created_at: 2026-02-20T09:36:22.000Z
updated_at: 2026-02-20T09:36:22.000Z
priority: must
tags:
  - enforcement
  - hooks
links:
  - type: validates
    target: SCEN-009
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-011
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2412bb3bafb595cf4c866463
    test_id: TEST-011
    scope: end_to_end
    outcome: passed
    code_snapshot: 287d8b7e21fc5ebfe33742e839feb2dd6ab1c5b91349284c293a90ceeeb17a0c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T10:17:03.316Z'
    finished_at: '2026-10-27T10:17:24.257Z'
    artifact_digest: 7cfe1849278bcd019309a0f6244e25eb89d6f582e9bb50e3414f2efc06272ece
    contract_hash: 87317508d1ef51f0b901a9c4da2ef0dabb8fa691cd8dd46d8bb233e98823fce8
    binding_hash: 91c0d5634c6fdf60d592064c4cda7d2d2cd63b3732a21c78830b874af97c60aa
    fingerprint: 9a90a921700efdcf5b56a1c243f8172112ce6bfd7ea42e13f785dde3273bd9cb
    fingerprint_components:
      contract: 87317508d1ef51f0b901a9c4da2ef0dabb8fa691cd8dd46d8bb233e98823fce8
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-test-011
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Covered by packages/cli/tests/commands/init.test.ts pre-commit hook tests.
