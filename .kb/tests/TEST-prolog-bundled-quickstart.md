---
title: Install guidance contract and README quick-start walkthrough controls
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
    - symbol_id: SYM-test-bundled-swipl-docs
      target: default
    - symbol_id: SYM-test-simulate-readme-quickstart
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-quickstart
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c41eb67100cb35077c0602ce
    test_id: TEST-prolog-bundled-quickstart
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
    binding_hash: 3d2065f398656cec050ad1333050ddf491fa426aced0ee43584438ba422ea773
    fingerprint: 751fad5fd9819f500d13719e27aba79967faf25d764c277eb0d1b5dc64198e46
    fingerprint_components:
      contract: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
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
      - symbol_id: SYM-test-bundled-swipl-docs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-simulate-readme-quickstart
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
This checks the install-guidance contract and the README walkthrough controls. The README quick start is run literally on runners with no `swipl`, on all four platforms.
