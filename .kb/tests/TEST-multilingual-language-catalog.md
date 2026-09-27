---
title: Installed multilingual catalog and exact-index ownership behavior
status: active
text_ref: documentation/tests/e2e/packed/multilingual-language-catalog.test.ts
tags:
  - multilingual
  - source-analysis
  - catalog
  - e2e
  - consumer
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-multilingual-language-catalog
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-multilingual-language-catalog
    target: default
    native_id: documentation/tests/e2e/packed/multilingual-language-catalog.test.ts::runs offline qualified catalog, ambiguity, and exact-index ownership behavior from installed tarballs
id: TEST-multilingual-language-catalog
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f729471c0c4904729c04dd8e
    test_id: TEST-multilingual-language-catalog
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a4d33ffc576a16f68e502d3a2086100380f23d54976de35dc5e2a45e95ffcd0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T12:49:03.127Z'
    finished_at: '2026-09-27T13:19:49.486Z'
    artifact_digest: 6d59b3c0049b625c1357bc0c860f9fc1e736c49f0b21fc69f54c7272cca053c2
    contract_hash: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
    binding_hash: a953894131e8aff493f1f28cb09cadd36e48b682d4da051cd73273deed148991
    fingerprint: 7d0c7665f816207139ec0499619ab287ca7a3b1baf3a599ca2e4b34bc52527a9
    fingerprint_components:
      contract: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: c029a9841c62256a1fe8b18a6fd5efeff5a489d1e46cb1f8af747f4c1373d4b8
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-language-catalog
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
