---
id: TEST-kibi-verification-evidence-contract
title: End-to-end verification receipt contract
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
source: documentation/tests/TEST-kibi-verification-evidence-contract.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - verification
  - e2e
  - playwright
  - receipts
  - proof
  - test
links:
  - type: validates
    target: SCEN-kibi-verification-evidence-contract
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-verification-evidence-contract
  required_case_symbols:
    - SYM-test-packed-fresh-verification-receipts
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b73ddf34f1be93571d904fcc
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:17:42.775Z'
    finished_at: '2026-08-16T19:18:30.563Z'
    artifact_digest: 593d712c8312283709bc5027a57c8b2dc8e63d81e7d5045b2616234bd9494e8c
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47788
  - version: kibi.verification-receipt.v2
    receipt_id: VR-962dc76ce447f822445cae18
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:26:12.122Z'
    finished_at: '2026-08-16T21:27:15.829Z'
    artifact_digest: 94893f5db6c7661e4745afbc81fb8e2acdaa62f9db02ed0ac8c11d30d03ea552
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 63707
  - version: kibi.verification-receipt.v2
    receipt_id: VR-625f019df25f71584f7c308e
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:51:47.815Z'
    finished_at: '2026-08-16T21:52:30.956Z'
    artifact_digest: 7ad5432659935910606e4c5086b5ca6f04d8d7cb346c1b144bef017f1f90913d
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43141
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d69315f630d36120d0c9558e
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:13:26.815Z'
    finished_at: '2026-08-17T12:14:06.939Z'
    artifact_digest: 25826a00b37253261999f1f7c547c9fbf63aeff348508f1d92bb76327f953cdf
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40124
---

Receipt and reporter tests verify stable case IDs, contract and snapshot binding, append-only history across contract evolution, exact argv capture, first-attempt proof semantics, and rejection of stale, skipped, retried, partial, or mismatched runs. Earlier-contract receipts remain immutable audit evidence, while only a receipt for the current contract and snapshot contributes proof.
