---
title: Predicate Suggestion Relevance End-to-End Contract
status: active
priority: must
text_ref: packages/mcp/tests/tools/suggest-predicates.test.ts
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - relevance
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-predicate-suggestion-relevance-v1
  required_case_symbols:
    - SYM-kibi-predicate-suggestion-relevance-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-predicate-suggestion-relevance-v1
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-58486d4d8eb94abb97c68702
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T08:04:36.353Z'
    finished_at: '2026-08-21T08:04:37.770Z'
    artifact_digest: 02a68e51cc19eb0e71ebdbba338ecc1b4494fa60810be815a267930ba69421fa
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: failed
        retries: 0
        duration_ms: 1417
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f82d1499e0ba9492712f6fdc
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T08:04:58.277Z'
    finished_at: '2026-08-21T08:07:44.533Z'
    artifact_digest: 72e17d33a1bbd4bfb04df65293f5cc75dc850328c449779b4661ca35fe4dd7b5
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: failed
        retries: 0
        duration_ms: 166256
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b3899c39e9a1987b069073eb
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T08:08:08.538Z'
    finished_at: '2026-08-21T08:11:12.603Z'
    artifact_digest: 23502bc4a7d4e589ad5e6eb2c3bfea2175bb0ca14be807d93f116823a447576a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 184065
---
