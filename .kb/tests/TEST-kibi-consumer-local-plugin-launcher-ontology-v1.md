---
title: Reusable Consumer-Local Plugin Launcher End-to-End Contract
status: active
priority: must
text_ref: documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts
tags:
  - kibi
  - test
  - e2e
  - launcher
  - consumer-local
  - ontology
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
  required_case_symbols:
    - SYM-cursor-packed-launcher-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-130105e269fde4003858a9af
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T08:11:40.688Z'
    finished_at: '2026-08-21T08:13:52.808Z'
    artifact_digest: 484835dea20b90d7b8ec394ac87f8072db4ce505d036e29b7b3f1d8a5e88b0da
    contract_hash: 89ed27e809e289b3b340c752dda7b497006bad5ed35cec650681d479c2737a19
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: failed
        retries: 0
        duration_ms: 132120
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ca5db5e9fe51df5b8c3d9a49
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T08:14:17.594Z'
    finished_at: '2026-08-21T08:16:07.698Z'
    artifact_digest: 211a682182b2a551021b4ad689f0bd4681490ebeed6b1a91f32252ec959a5adc
    contract_hash: 89ed27e809e289b3b340c752dda7b497006bad5ed35cec650681d479c2737a19
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: failed
        retries: 0
        duration_ms: 110104
---
