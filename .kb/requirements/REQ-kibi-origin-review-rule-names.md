---
title: Origin review check rule names
status: open
semantic_text: The unapproved agent requirement rule shall be agent-requirement-unapproved. The unapproved exception rule shall be exception-unapproved. The self-attested exception approval rule shall be exception-approval-self-attested. The missing requirement rationale rule shall be requirement-rationale-missing.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 76cc1c623e1d6a754987f79963eeee3794baf9f78c208d5c301d9c70053ad9bd
semantic_inventory:
  - claim_key: CLAIM-F67FF62F420AF804
    claim_text: The unapproved agent requirement rule shall be agent-requirement-unapproved
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-18FA2C11AFA7F302
    claim_text: The unapproved exception rule shall be exception-unapproved
    role: normative
    status: modeled
    span:
      start: 77
      end: 136
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-5DDCB11FE4E1B302
    claim_text: The self-attested exception approval rule shall be exception-approval-self-attested
    role: normative
    status: modeled
    span:
      start: 138
      end: 221
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-6A0DF299ADF1444D
    claim_text: The missing requirement rationale rule shall be requirement-rationale-missing
    role: normative
    status: modeled
    span:
      start: 223
      end: 300
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F67FF62F420AF804
  - CLAIM-18FA2C11AFA7F302
  - CLAIM-5DDCB11FE4E1B302
  - CLAIM-6A0DF299ADF1444D
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:08:59.391Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-origin-review-rule-names
type: req
---
The unapproved agent requirement rule shall be agent-requirement-unapproved. The unapproved exception rule shall be exception-unapproved. The self-attested exception approval rule shall be exception-approval-self-attested. The missing requirement rationale rule shall be requirement-rationale-missing.

## Context

packages/cli/src/public/operations/origin-review.ts names the rules that review where requirements and exceptions came from.

REQ-kibi-kb-lifecycle-integrity has kb_check report every finding under a stable rule name an agent can filter on: the evidence floor that arrived with KB schema 11, the origin review rules, the policy rules, the symbol granularity rule, the acknowledged supersede rule and the note a scoped check adds when it leaves quality rules out. They are stated here so every name is proved against its constant.

## Why this changed

Split from REQ-kibi-check-rule-names, which held eleven names declared by five modules. Each child is the set of names one check family declares, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
