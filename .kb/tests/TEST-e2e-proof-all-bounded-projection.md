---
title: Installed public prove-all excludes large unrelated archived test metadata
status: active
text_ref: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - proof
  - consumer
  - projection
  - e2e
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
    receipt_id: PR-dd15f2fdcda8125670b7a7c7
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: a3c1a48e120e41d83d68ccf876658668c913dd55b88bb2ac812d0bc0bf2acccd
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T16:13:59.550Z'
    finished_at: '2026-09-26T16:48:47.610Z'
    artifact_digest: 930eef24b16e9c22c9ff81a84ada6b666cbf92db14067f5ddc7f3fa497217e38
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 148b872b1bbd658c1651e88a3504c09c81dc12ec77c384422a49647a5bf4a224
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
---
The relocated packed consumer exercises the public prove --all command with 501 tests, including 500 archived noncontract records. It asserts the sole contract is executed once, actual assertion results produce a passing receipt, and the receipt is queryable afterward. It separately measures reconstructed full-property JSON above 10 MiB over bounded public query pages.
