---
id: REQ-kibi-proof-aware-quality-diagnostics
title: Quality diagnostics respect snapshot-bound proof evidence
status: open
created_at: 2026-08-14T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
source: documentation/requirements/REQ-kibi-proof-aware-quality-diagnostics.md
priority: must
tags:
  - requirements
  - diagnostics
  - coverage
  - proof
  - receipts
  - telemetry
logic_claims:
  - CLAIM-33DAF370A02DCC89
  - CLAIM-ABCF552AF7013256
  - CLAIM-DAD987CB98C79901
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4bb30360585205e2d2a31e0480dbf249b0e9bdae92e0fb89ecd467c4bb57689b
semantic_inventory:
  - claim_key: CLAIM-33DAF370A02DCC89
    claim_text: Full checks must use the same live snapshot-bound receipt evidence as requirement coverage when deciding whether to emit coverage-depth diagnostics
    role: normative
    status: modeled
    span:
      start: 0
      end: 147
  - claim_key: CLAIM-ABCF552AF7013256
    claim_text: A fresh passing scenario-backed E2E receipt must not produce a contradictory weak-depth warning when other proof gaps remain
    role: normative
    status: modeled
    span:
      start: 149
      end: 273
  - claim_key: CLAIM-DAD987CB98C79901
    claim_text: Receipt freshness diagnostics must identify affected requirements and tests and direct agents to kibi prove with current proof receipts
    role: normative
    status: modeled
    span:
      start: 275
      end: 410
links:
  - type: depends_on
    target: REQ-kibi-conservative-requirement-proof
  - type: specified_by
    target: SCEN-kibi-proof-aware-quality-diagnostics
  - type: verified_by
    target: TEST-kibi-proof-aware-quality-diagnostics
semantic_text: Full checks must use the same live snapshot-bound receipt evidence as requirement coverage when deciding whether to emit coverage-depth diagnostics. A fresh passing scenario-backed E2E receipt must not produce a contradictory weak-depth warning when other proof gaps remain. Receipt freshness diagnostics must identify affected requirements and tests and direct agents to kibi prove with current proof receipts.
semantic_clauses:
  - Full checks must use the same live snapshot-bound receipt evidence as requirement coverage when deciding whether to emit coverage-depth diagnostics
  - A fresh passing scenario-backed E2E receipt must not produce a contradictory weak-depth warning when other proof gaps remain
  - Receipt freshness diagnostics must identify affected requirements and tests and direct agents to kibi prove with current proof receipts
type: req
---

Full checks must use the same live snapshot-bound receipt evidence as requirement coverage when deciding whether to emit coverage-depth diagnostics. A fresh passing scenario-backed E2E receipt must not produce a contradictory weak-depth warning when other proof gaps remain. Receipt freshness diagnostics must identify affected requirements and tests and direct agents to kibi prove with current proof receipts.
