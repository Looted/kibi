---
title: Installed public prove-all excludes large unrelated archived test metadata
status: active
tags:
  - proof
  - consumer
  - projection
  - e2e
text_ref: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-e2e-proof-all-bounded-projection
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-proof-all-bounded-projection
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-proof-all-bounded-projection
    target: default
    native_id: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts::selects the sole proof contract without materializing 500 large archived test records
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3476c57347d7b6da029acebb
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 43408a7c8cd057c8ccfeea5072b76aea8cddf14776ca64ae8b3b2fd545b08a52
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
