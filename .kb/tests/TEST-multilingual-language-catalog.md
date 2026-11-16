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
    receipt_id: PR-ccb4a8ca1070a3574ddd024c
    test_id: TEST-multilingual-language-catalog
    scope: end_to_end
    outcome: passed
    code_snapshot: 97a1f8ae8b5497330ab28e93a9d81f8e7d9ff5ea036c1beb3794253bf0b278cb
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T08:17:00.084Z'
    finished_at: '2026-11-16T08:18:39.878Z'
    artifact_digest: 491c3dea434d4dfb6c2e11403960dad0bd9815d05320a6929714b5ec558fbb47
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
