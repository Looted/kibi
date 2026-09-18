---
title: Packed compile-intent plan hash binding and apply rejection
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-plan-compiler-hash
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9cd0e08254a0ded5beca2010
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: 3f0d0b221c823c6a0b41fbdbb964e9d0fe5a03e305a12a00f52dc4ac7e36d642
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-91044351852390a114a51835
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: e88cd2b01f74b3142e9ec37789825233290a35e52c3363da763f307d61ab42b3
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Packed end-to-end regression for packed compile-intent plan hash binding and apply rejection.
