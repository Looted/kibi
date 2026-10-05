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
    receipt_id: PR-4c8238ce795f3d24e724e28d
    test_id: TEST-multilingual-language-catalog
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
    binding_hash: 6b8f9e10a5667fe32117cd02737fcffd0713cdde39a07cc7c285c2309af7b086
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
