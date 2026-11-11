---
title: Evidence floor check rule name
status: open
semantic_text: The evidence floor check rule shall be evidence-floor. Evidence floors shall start at KB schema version 11.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6a8f0a9a3857d19ecd92ec3874a950d9eccbb70656cdac7789eac40ddad14a03
semantic_inventory:
  - claim_key: CLAIM-C97BCBA32B6056FD
    claim_text: The evidence floor check rule shall be evidence-floor
    role: normative
    status: modeled
    span:
      start: 0
      end: 53
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-75CDA06E155F91E2
    claim_text: Evidence floors shall start at KB schema version 11
    role: normative
    status: modeled
    span:
      start: 55
      end: 106
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-C97BCBA32B6056FD
  - CLAIM-75CDA06E155F91E2
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:08:43.679Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-evidence-floor-rule-name
type: req
---
The evidence floor check rule shall be evidence-floor. Evidence floors shall start at KB schema version 11.

## Context

packages/cli/src/public/operations/evidence-floor.ts names the evidence floor rule and the schema version it starts at.

REQ-kibi-kb-lifecycle-integrity has kb_check report every finding under a stable rule name an agent can filter on: the evidence floor that arrived with KB schema 11, the origin review rules, the policy rules, the symbol granularity rule, the acknowledged supersede rule and the note a scoped check adds when it leaves quality rules out. They are stated here so every name is proved against its constant.

## Why this changed

Split from REQ-kibi-check-rule-names, which held eleven names declared by five modules. Each child is the set of names one check family declares, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
