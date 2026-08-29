---
id: TEST-013
title: supersedes relationship traversal and current_adr inference
status: active
created_at: 2026-02-20T10:35:09.000Z
updated_at: 2026-02-20T10:35:09.000Z
source: brief.md
priority: must
tags:
  - adr
  - inference
  - temporal
links:
  - type: validates
    target: SCEN-011
verification_scope: end_to_end
verification_perspective: internal
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-013
  required_case_symbols:
    - SYM-test-core-adr-supersession
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7769b1aea816e9cd0b9296d3
    test_id: TEST-013
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-013
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-013
    scope: end_to_end
    outcome: passed
    code_snapshot: 7e2cb1e6e8924609e957172e653ee99955405aba25fe942da5d8deaa660aa428
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T06:26:58.448Z'
    finished_at: '2026-08-28T06:26:58.884Z'
    artifact_digest: ebfd9ded887fea179b97aa46106a13caa58a1ad9a909b8223baf8c64fcad5706
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 436
  - version: kibi.verification-receipt.v2
    receipt_id: VR-23e98fd69d240ddcb942a4d1
    test_id: TEST-013
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-013
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-013
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:09:53.587Z'
    finished_at: '2026-08-28T13:09:53.969Z'
    artifact_digest: 7ecda8f509ce55a6f2eb445f0c8aa82acb4864ced216559d4599b7286cb96365
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 382
  - version: kibi.verification-receipt.v2
    receipt_id: VR-040523fe1c45d1ac1393d3ec
    test_id: TEST-013
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-013
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-013
    scope: end_to_end
    outcome: passed
    code_snapshot: 2a9a4a2399988f15d636abf26dce96e72aeb3afa439e03a5fcb39b9a984fdfff
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T14:03:17.819Z'
    finished_at: '2026-08-28T14:03:18.194Z'
    artifact_digest: 574b7f1c03693867ef01510c213b9cf97a3f8a3a493ae8025f3a6840c56b982f
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 375
---

## Test Cases

### Test 1: current_adr returns non-superseded ADRs

**Setup:**
- ADR-001 status: accepted, no supersedes relationship pointing to it
- ADR-005 status: deprecated, ADR-008 supersedes ADR-005
- ADR-008 status: accepted, no supersedes relationship pointing to it

**Expected Result:**
- current_adr(ADR-001) succeeds
- current_adr(ADR-008) succeeds
- current_adr(ADR-005) fails

### Test 2: adr_chain returns full temporal chain

**Setup:**
- ADR-001 → ADR-009 → ADR-010 (ADR-010 supersedes ADR-009 which supersedes ADR-001)

**Expected Result:**
- adr_chain(ADR-001, Chain) returns [ADR-001, ADR-009, ADR-010] in order (oldest to newest)
- Each result includes id, title, and status

### Test 3: superseded_by returns direct successor

**Setup:**
- ADR-005 with ADR-008 directly superseding it

**Expected Result:**
- superseded_by(ADR-005, ADR-008) succeeds
- Includes successor_id and successor_title in result

### Test 4: deprecated_no_successor detects orphaned ADRs

**Setup:**
- ADR-XXX status: deprecated, no supersedes relationship pointing to it

**Expected Result:**
- deprecated_no_successor(ADR-XXX) succeeds
- kibi check reports violation with rule: deprecated-adr-no-successor

### Test 5: kibi check passes for deprecated ADR with successor

**Setup:**
- ADR-005 status: deprecated, ADR-008 supersedes ADR-005

**Expected Result:**
- No deprecated-adr-no-successor violation for ADR-005
- kibi check passes
