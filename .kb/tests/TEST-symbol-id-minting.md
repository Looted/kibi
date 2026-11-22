---
title: Minted symbol ids never reuse a held id
status: passing
priority: must
verification_scope: end_to_end
tags:
  - symbol-id
  - kb_upsert
  - check-staged
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-symbol-id-minting
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T18:54:13.724Z'
id: TEST-symbol-id-minting
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b58f7b7b2551e68f46b39389
    test_id: TEST-symbol-id-minting
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: c5c64bda29d4823f8d663bcf55b4fc727b70c83bf8081946c6a7c3c2a0f49e49
    binding_hash: 8d9a2a84a793352cfd0907809228eea84c11b875b456c70ae72eab7006df9ea8
    fingerprint: 099631404b468c64b0d4d82f54b883dd43faa80a805f551165a66bb24d7864ac
    fingerprint_components:
      contract: c5c64bda29d4823f8d663bcf55b4fc727b70c83bf8081946c6a7c3c2a0f49e49
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
      - symbol_id: SYM-test-symbol-id-minting
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Mints type-shape record ids in the staged owner block next to ids the KB and other findings hold, and implementedBy symbol ids next to stored ones (packages/cli/tests/traceability/owner-findings.test.ts, packages/cli/tests/operations-mutation/mutation/implemented-by.test.ts).