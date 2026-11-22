---
title: Installed multilingual catalog and exact-index ownership behavior
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2a61f3bf3ff7737c9ccf4877
    test_id: TEST-multilingual-language-catalog
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
    binding_hash: 543b8ab01964b899eeb8cdc13531fa18ee303ffa8a8b52ab306f191cb0188b0d
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This proves the catalog and exact-index ownership through an installed package, because the grammars ship as pinned assets that only exist after packing.
