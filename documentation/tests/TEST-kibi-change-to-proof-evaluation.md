---
id: TEST-kibi-change-to-proof-evaluation
title: Change-to-proof evaluation harness
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-change-to-proof-evaluation.md
priority: should
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - evaluation
  - search
  - planning
  - dogfood
  - test
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-evaluation
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-change-to-proof-evaluation
  required_case_symbols:
    - SYM-test-kibi-change-to-proof-evaluation
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fb8ac7178c1409e6edb807f2
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:43:51.041Z'
    finished_at: '2026-08-16T19:43:51.072Z'
    artifact_digest: 7b9f7c86103c2db2e68ffd31b8cb02c16347167b165ba9b48b846ef4a3c1cf98
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-24ce5a0e2b8ce8145a84e69c
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:06:42.272Z'
    finished_at: '2026-08-16T22:06:42.310Z'
    artifact_digest: db55b551a6ba7558c044afe8670ec5764f7052796db23185edfdde1b75c4bc51
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38
---

The evaluator reads versioned JSONL gold fixtures and emits deterministic JSON with per-case matches, clause dispositions, abstentions, and aggregate scores. It fails closed when an expected result is missing or when a proof claim lacks the required evidence path.
