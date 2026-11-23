---
title: Doctor SWI-Prolog runtime report controls
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - prolog
  - bundle
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-doctor-runtime-report
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-doctor-runtime-report
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7d92935fc69c9ba298168ef7
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 88ce613c0da6ce036cf030529a029ea9cc0616c5b659fa44dc2ab29e5f3ec68b
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This checks the doctor runtime report, including the explanation for a missing bundle.
