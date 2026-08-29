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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-900e46c869b8c5bc9c5e170d
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
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T05:34:11.148Z'
    finished_at: '2026-08-29T05:34:11.582Z'
    artifact_digest: 1088965e7491ab55cf1eb23e7492b1756753874577c1a7437f7421b77a90193f
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 434
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dac1297e98b50260a95dc656
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
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:50:05.299Z'
    finished_at: '2026-08-29T07:50:05.543Z'
    artifact_digest: 42343268a08b251647d97bb4a8946eb7bcf380d49b85ac1ff84ffee9ecf8696f
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 244
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5f088a9a259250637f03fdb3
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
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:28:23.830Z'
    finished_at: '2026-08-29T08:28:24.062Z'
    artifact_digest: 6615208f1beab1bd784338993d2fb72419aa4719d460c7e7c7233e668ff4a2b4
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 232
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7178db8ba1ff4c4ee094698e
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
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:30:32.452Z'
    finished_at: '2026-08-29T08:30:32.681Z'
    artifact_digest: 21e2062851c2c1970fdde0b827d508ffdeba0a3c390ba5985af9f38553571fbe
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 229
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6d03a9d8b388bd86215a7ee4
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
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:19:54.450Z'
    finished_at: '2026-08-29T09:19:54.689Z'
    artifact_digest: de0862ce54e891851a15b505d980f5223797f502045fac0e298c50795f8964df
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 239
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8beb088c126bef1ccea379d4
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
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:49:34.677Z'
    finished_at: '2026-08-29T09:49:34.897Z'
    artifact_digest: 1167edc7daaeb65a86d0c6c62891c1c949e38eb9c94f73acee52134d253bbd73
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 220
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0a43ad7cd86dce01a20b4d7f
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
    code_snapshot: a1e8acca6edb3d4c59ea790f4840a75a26e642ecbbda1fffd13b67ec89f60df2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:29:41.797Z'
    finished_at: '2026-08-29T10:29:42.028Z'
    artifact_digest: a80f24ce92fa450c1a59a75c7a00c7a5ff3b7b5657e04f7548f0bc3148883dc9
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 231
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1bc8aec479074f0a624b4a96
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
    code_snapshot: 4dcb52daacd2e6301cb225622dbda1c10a95ea1252b73faa3a34235c61fe9d71
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T11:01:16.793Z'
    finished_at: '2026-08-29T11:01:17.022Z'
    artifact_digest: 7f6d7014e6719ab73b5da272924b73aca633c38e3f8683ba750d798ba3117429
    contract_hash: 06a2bb72e347f0c35988c065b80001fad57d323177d0975c11af311330ef2273
    case_results:
      - symbol_id: SYM-test-core-adr-supersession
        project: default
        outcome: passed
        retries: 0
        duration_ms: 229
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
