---
title: Kibi's evidence level vocabulary
status: open
priority: must
firmness: firm
semantic_text: Kibi evidence levels shall be proved, tested, asserted and unverified.
semantic_clauses:
  - Kibi evidence levels shall be proved, tested, asserted and unverified.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:06:01.443Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bb11f84fb84272727a638bf3044cfa9ebf0be262b14f3924b6cc6ba476d00bd3
semantic_inventory:
  - claim_key: CLAIM-ABCB82718BC90BF2
    claim_text: Kibi evidence levels shall be proved, tested, asserted and unverified
    role: normative
    status: modeled
    span:
      start: 0
      end: 69
logic_claims:
  - CLAIM-ABCB82718BC90BF2
id: REQ-kibi-evidence-level-vocabulary
type: req
---
Kibi evidence levels shall be proved, tested, asserted and unverified.

## Context

EVIDENCE_LEVELS in packages/cli/src/public/evidence-levels.ts is the closed list of evidence levels coverage, report and signoff use. REQ-kibi-evidence-levels says when each level applies; this requirement states the list itself so it is proved against the code.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"