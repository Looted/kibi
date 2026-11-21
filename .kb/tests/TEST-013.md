---
id: TEST-013
title: supersedes relationship traversal and current_adr inference
status: passing
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
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-adr-supersession
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b1b4ab62f663887c68ec7676
    test_id: TEST-013
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: b9d5f2462dcdad98a14ee13e3cc4addb6de3c5cc76a18c215eab4fbab6c6acc6
    binding_hash: 6b89a4dece45b511cee3f02a328ff895c49bb0ba27e7e262c86aec0190dd2b9b
    fingerprint: 901da7fae22689611b3a4c603ab197c36a25b5e876befb3c903df29843b77eb8
    fingerprint_components:
      contract: b9d5f2462dcdad98a14ee13e3cc4addb6de3c5cc76a18c215eab4fbab6c6acc6
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
      - symbol_id: SYM-test-core-adr-supersession
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
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
