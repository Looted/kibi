---
title: Logical requirement rule limits
status: open
priority: must
firmness: firm
semantic_text: The logic IR version shall be kibi.logic.v1. A logical rule shall hold at most 64 atoms. A logical rule shall nest at most 16 levels deep. A logical rule shall use at most 32 variables.
semantic_clauses:
  - The logic IR version shall be kibi.logic.v1.
  - A logical rule shall hold at most 64 atoms.
  - A logical rule shall nest at most 16 levels deep.
  - A logical rule shall use at most 32 variables.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:18:41.397Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 45105d01b4999a57f8884f593e98f5d79fd4e6ec5b5941af9cc4b867bd1560bd
semantic_inventory:
  - claim_key: CLAIM-9C471A9A9A09BBF9
    claim_text: The logic IR version shall be kibi.logic.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 43
  - claim_key: CLAIM-4D43FA87C153EBE8
    claim_text: A logical rule shall hold at most 64 atoms
    role: normative
    status: modeled
    span:
      start: 45
      end: 87
  - claim_key: CLAIM-FEB9A725F1FA8930
    claim_text: A logical rule shall nest at most 16 levels deep
    role: normative
    status: modeled
    span:
      start: 89
      end: 137
  - claim_key: CLAIM-FA3DB343EC00BA03
    claim_text: A logical rule shall use at most 32 variables
    role: normative
    status: modeled
    span:
      start: 139
      end: 184
logic_claims:
  - CLAIM-9C471A9A9A09BBF9
  - CLAIM-4D43FA87C153EBE8
  - CLAIM-FEB9A725F1FA8930
  - CLAIM-FA3DB343EC00BA03
id: REQ-kibi-logic-rule-limits
type: req
---
The logic IR version shall be kibi.logic.v1. A logical rule shall hold at most 64 atoms. A logical rule shall nest at most 16 levels deep. A logical rule shall use at most 32 variables.

## Context

packages/cli/src/logic/ir.ts versions the logic IR that REQ-kibi-logical-requirement-coverage compiles requirement rules into, and bounds how many atoms, how deep a nesting and how many variables one rule may hold. They are stated here so every bound is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"