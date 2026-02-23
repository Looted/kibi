---
id: TEST-013
title: supersedes relationship traversal and current_adr inference
status: active
created_at: 2026-02-20T10:35:09Z
updated_at: 2026-02-20T10:35:09Z
source: brief.md
priority: must
tags:
  - adr
  - inference
  - temporal
links:
  - type: validates
    target: REQ-016
---

## Test Cases

### Test 1: current_adr returns non-superseded ADRs

**Setup:**
- ADR-001 status: active, no supersedes relationship pointing to it
- ADR-005 status: deprecated, ADR-008 supersedes ADR-005
- ADR-008 status: active, no supersedes relationship pointing to it

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
