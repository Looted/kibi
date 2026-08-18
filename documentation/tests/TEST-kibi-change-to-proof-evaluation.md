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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0ccb8e94cf2e58df2788b45f
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
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:26:52.707Z'
    finished_at: '2026-08-17T12:26:52.738Z'
    artifact_digest: 61f787596c06870ae3fb3ea2f3ec38c976c1c637e8f73fd3e19458c2310d1796
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-08222f11d76ffe358b50497a
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
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:19:34.759Z'
    finished_at: '2026-08-17T21:19:34.786Z'
    artifact_digest: da2b77c76a8b84a8f44cf3e00ed041371c3d552f5585cf289c6533489b54d732
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 27
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f22952e56401e1467336fb61
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
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:35:12.593Z'
    finished_at: '2026-08-18T07:35:12.626Z'
    artifact_digest: 7f764eb1e12b78d469249ad7a80cc09fc06f49a7a57848b05101489149614260
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
---

The evaluator reads versioned JSONL gold fixtures and emits deterministic JSON with per-case matches, clause dispositions, abstentions, and aggregate scores. It fails closed when an expected result is missing or when a proof claim lacks the required evidence path.
