---
title: Signoff gate and change labels
status: open
priority: must
firmness: firm
semantic_text: A signoff gate shall be semantic, scenario, implementation, e2e, evidence or tested. A signoff change shall be new, changed, affected or retired. The signoff label of the semantic gate shall be semantic model incomplete. The signoff label of the scenario gate shall be no scenario yet. The signoff label of the implementation gate shall be no owning code yet. The signoff label of the e2e gate shall be no end-to-end test yet. The signoff label of the evidence gate shall be end-to-end evidence not current. The signoff label of the tested gate shall be tested. The signoff label of a new change shall be New. The signoff label of a changed change shall be Changed. The signoff label of a retired change shall be Superseded or retired.
semantic_clauses:
  - A signoff gate shall be semantic, scenario, implementation, e2e, evidence or tested.
  - A signoff change shall be new, changed, affected or retired.
  - The signoff label of the semantic gate shall be semantic model incomplete.
  - The signoff label of the scenario gate shall be no scenario yet.
  - The signoff label of the implementation gate shall be no owning code yet.
  - The signoff label of the e2e gate shall be no end-to-end test yet.
  - The signoff label of the evidence gate shall be end-to-end evidence not current.
  - The signoff label of the tested gate shall be tested.
  - The signoff label of a new change shall be New.
  - The signoff label of a changed change shall be Changed.
  - The signoff label of a retired change shall be Superseded or retired.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T22:21:32.453Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 080fce4e39e4829d04b1827aea50630433efedff410d37a0c330e09e37fcaf8f
semantic_inventory:
  - claim_key: CLAIM-75F9C04B75BBEBCC
    claim_text: A signoff gate shall be semantic, scenario, implementation, e2e, evidence or tested
    role: normative
    status: modeled
    span:
      start: 0
      end: 83
  - claim_key: CLAIM-B8B22A3C064D6B6B
    claim_text: A signoff change shall be new, changed, affected or retired
    role: normative
    status: modeled
    span:
      start: 85
      end: 144
  - claim_key: CLAIM-B20BC67185B2BA0F
    claim_text: The signoff label of the semantic gate shall be semantic model incomplete
    role: normative
    status: modeled
    span:
      start: 146
      end: 219
  - claim_key: CLAIM-E35356B617F26B36
    claim_text: The signoff label of the scenario gate shall be no scenario yet
    role: normative
    status: modeled
    span:
      start: 221
      end: 284
  - claim_key: CLAIM-55563572F4FF1450
    claim_text: The signoff label of the implementation gate shall be no owning code yet
    role: normative
    status: modeled
    span:
      start: 286
      end: 358
  - claim_key: CLAIM-91CB54BAA02C246A
    claim_text: The signoff label of the e2e gate shall be no end-to-end test yet
    role: normative
    status: modeled
    span:
      start: 360
      end: 425
  - claim_key: CLAIM-50B54C8A85A31CE3
    claim_text: The signoff label of the evidence gate shall be end-to-end evidence not current
    role: normative
    status: modeled
    span:
      start: 427
      end: 506
  - claim_key: CLAIM-0FCFFD753F3EB91E
    claim_text: The signoff label of the tested gate shall be tested
    role: normative
    status: modeled
    span:
      start: 508
      end: 560
  - claim_key: CLAIM-A60DF82872D0C155
    claim_text: The signoff label of a new change shall be New
    role: normative
    status: modeled
    span:
      start: 562
      end: 608
  - claim_key: CLAIM-0FCFE3224FE26F61
    claim_text: The signoff label of a changed change shall be Changed
    role: normative
    status: modeled
    span:
      start: 610
      end: 664
  - claim_key: CLAIM-2AD8CEB028472F05
    claim_text: The signoff label of a retired change shall be Superseded or retired
    role: normative
    status: modeled
    span:
      start: 666
      end: 734
logic_claims:
  - CLAIM-75F9C04B75BBEBCC
  - CLAIM-B8B22A3C064D6B6B
  - CLAIM-B20BC67185B2BA0F
  - CLAIM-E35356B617F26B36
  - CLAIM-55563572F4FF1450
  - CLAIM-91CB54BAA02C246A
  - CLAIM-50B54C8A85A31CE3
  - CLAIM-0FCFFD753F3EB91E
  - CLAIM-A60DF82872D0C155
  - CLAIM-0FCFE3224FE26F61
  - CLAIM-2AD8CEB028472F05
id: REQ-kibi-signoff-labels
type: req
---
A signoff gate shall be semantic, scenario, implementation, e2e, evidence or tested. A signoff change shall be new, changed, affected or retired. The signoff label of the semantic gate shall be semantic model incomplete. The signoff label of the scenario gate shall be no scenario yet. The signoff label of the implementation gate shall be no owning code yet. The signoff label of the e2e gate shall be no end-to-end test yet. The signoff label of the evidence gate shall be end-to-end evidence not current. The signoff label of the tested gate shall be tested. The signoff label of a new change shall be New. The signoff label of a changed change shall be Changed. The signoff label of a retired change shall be Superseded or retired.

## Context

packages/cli/src/signoff/model.ts labels the signoff views REQ-kibi-signoff-views renders: every gate a requirement can still be waiting on and every kind of change a signoff lists. The gate and change names and their labels are stated here so each is proved against the label tables.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"