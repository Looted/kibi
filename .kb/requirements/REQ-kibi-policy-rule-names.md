---
title: Policy check rule names
status: open
semantic_text: The policy markers rule shall be policy-markers. The policy ownership rule shall be policy-ownership.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3b1ceca1a0ed0685c987ec54066dbab96ba654b489812912b381418615180fcd
semantic_inventory:
  - claim_key: CLAIM-B7F45C2F4CC9E21A
    claim_text: The policy markers rule shall be policy-markers
    role: normative
    status: modeled
    span:
      start: 0
      end: 47
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-07BF06E3E4B8056F
    claim_text: The policy ownership rule shall be policy-ownership
    role: normative
    status: modeled
    span:
      start: 49
      end: 100
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-B7F45C2F4CC9E21A
  - CLAIM-07BF06E3E4B8056F
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:09:29.592Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-policy-rule-names
type: req
---
The policy markers rule shall be policy-markers. The policy ownership rule shall be policy-ownership.

## Context

packages/cli/src/public/operations/check-policy-rules.ts names the policy rules.

REQ-kibi-kb-lifecycle-integrity has kb_check report every finding under a stable rule name an agent can filter on: the evidence floor that arrived with KB schema 11, the origin review rules, the policy rules, the symbol granularity rule, the acknowledged supersede rule and the note a scoped check adds when it leaves quality rules out. They are stated here so every name is proved against its constant.

## Why this changed

Split from REQ-kibi-check-rule-names, which held eleven names declared by five modules. Each child is the set of names one check family declares, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
