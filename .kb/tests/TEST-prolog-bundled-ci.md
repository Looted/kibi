---
title: CI workflow contract, proof workflow contract, and cached-build population controls
status: passing
tags:
  - prolog
  - bundle
  - ci
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-workflow-contract
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-ci
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-94f113b15d2660ac81b65dbd
    test_id: TEST-prolog-bundled-ci
    scope: end_to_end
    outcome: passed
    code_snapshot: c6fc9e20ab5c1cd39ba4527550a3bc52a450d1d80d9513ce861b3c69d037d07b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-11T17:43:12.104Z'
    finished_at: '2026-11-11T17:43:14.888Z'
    artifact_digest: 3d90a7d0c7c1a10b7f77427420dbc21bbacd77705d6ab3e2aafc3776d9bbfbc5
    contract_hash: 2367af30118c15fbb90e61344777bfac636742cf30e80ccfc6daaa8b6f2ab522
    binding_hash: 614af495d18c1bc97e258d74b3ebd4e78dbf3502e4a69a10135a0a489bfd5be3
    fingerprint: f01ea5ffe1b7c0d6344908fe7c97ff86964d9fda87fe2e6113b40cd2fe59b544
    fingerprint_components:
      contract: 2367af30118c15fbb90e61344777bfac636742cf30e80ccfc6daaa8b6f2ab522
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
      - symbol_id: SYM-test-ci-workflow-contract
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
This checks the CI and proof workflow contracts, and that a cached build is populated only after verification.
