---
title: Install guidance contract and README quick-start walkthrough controls
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9eb34f415c015d3a92f9f1bc
    test_id: TEST-prolog-bundled-quickstart
    scope: end_to_end
    outcome: passed
    code_snapshot: 96401fc2c08e94005fbe58f94859e7405d9ae6a010791e8cba0d5f99dcd8d611
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T04:02:23.227Z'
    finished_at: '2026-10-01T04:02:23.321Z'
    artifact_digest: 5fb418f9241e903231a945eb1dd67d8a2079598e21c3eb5ee4eff2c3c81ceb0e
    contract_hash: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
    binding_hash: c76ebf0a234811fd6d7bf61b718ecba66a685acde6cb335816d03d790ed3b5ab
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
---
