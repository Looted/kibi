---
title: SWI-Prolog pipeline validates artifact boundaries with behavioral controls
status: passing
tags:
  - prolog
  - build
  - pipeline
  - validation
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-build-pipeline-validation
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-build-pipeline-validation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7f9b983c015d18aa6728086e
    test_id: TEST-prolog-build-pipeline-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: fa8ed7e7a47f3e29e4608719b727382d5d43637c25a9ac83c462a3b83358530b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T13:47:50.657Z'
    finished_at: '2026-11-20T13:47:57.986Z'
    artifact_digest: 4a6aa92b6ecdf71d7f3f4b166c15336bec5af18c763680ad768d9b83c9ffbaea
    contract_hash: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
    binding_hash: 654601b92428bdc2ec7e55e47580c894a9b40ee835c297cfd7145b442cc3f7a2
    fingerprint: a2662d6d8f5823a794ae2fd17d2c367a7b2ef5baf917b021b29f21fc0d5d3477
    fingerprint_components:
      contract: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
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
      - symbol_id: SYM-test-prolog-build-pipeline-validation
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
The native pipeline builds, relocates, strips and signs every file, and the controls check the artifact boundaries, so a defect fails locally before an expensive four-platform run. Source: PR 299 phase 2: "Local pipeline controls: 70 passed".
