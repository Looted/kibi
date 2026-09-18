---
title: Packed CLI model-requirement returns strict and observation write sets
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-strict-modeling-surface
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-strict-modeling-surface
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-592f93251a3f11d22c3bb63a
    test_id: TEST-e2e-strict-modeling-surface
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: 62bb341ec3ac05030910a1c9ef20b04db9a017531d44d6c618742400599fcf73
    binding_hash: 1895dcc383be85f5199136b8bc0ee365c9f217d61482839e302144c5f04c88e0
    fingerprint: 740ddc7856ffc78f07747b107d7ac80da29ce52d84cd834fbfb45caa6f13652c
    fingerprint_components:
      contract: 62bb341ec3ac05030910a1c9ef20b04db9a017531d44d6c618742400599fcf73
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
      - symbol_id: SYM-e2e-test-cli-strict-modeling-surface
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1b6dce2ffb98b26e371a4e27
    test_id: TEST-e2e-strict-modeling-surface
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: 62bb341ec3ac05030910a1c9ef20b04db9a017531d44d6c618742400599fcf73
    binding_hash: 71f2fc81938d2b2b393040104766864f8b2071307635d92a877d9f330257406f
    fingerprint: 740ddc7856ffc78f07747b107d7ac80da29ce52d84cd834fbfb45caa6f13652c
    fingerprint_components:
      contract: 62bb341ec3ac05030910a1c9ef20b04db9a017531d44d6c618742400599fcf73
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
      - symbol_id: SYM-e2e-test-cli-strict-modeling-surface
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Packed end-to-end regression for packed cli model-requirement returns strict and observation write sets.
