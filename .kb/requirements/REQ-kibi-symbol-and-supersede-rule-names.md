---
title: Symbol granularity, supersedes reason and scoped check names
status: open
semantic_text: The symbol granularity rule shall be symbol-granularity. The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged. The scoped check omission note id shall be scoped_check_omitted_quality.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0a7d5886fcb7d25651297a822cb098fdff501cfecb16eb03069a497407700b83
semantic_inventory:
  - claim_key: CLAIM-5C7C8091600FD22F
    claim_text: The symbol granularity rule shall be symbol-granularity
    role: normative
    status: modeled
    span:
      start: 0
      end: 55
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-D6F1B2CD2BC64534
    claim_text: The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged
    role: normative
    status: modeled
    span:
      start: 57
      end: 136
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-CDC574A1940BB7F6
    claim_text: The scoped check omission note id shall be scoped_check_omitted_quality
    role: normative
    status: modeled
    span:
      start: 138
      end: 209
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5C7C8091600FD22F
  - CLAIM-D6F1B2CD2BC64534
  - CLAIM-CDC574A1940BB7F6
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:09:45.985Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-symbol-and-supersede-rule-names
type: req
---
The symbol granularity rule shall be symbol-granularity. The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged. The scoped check omission note id shall be scoped_check_omitted_quality.

## Context

The symbol granularity check, the decision firmness check and the scoped check helpers each declare one of these names.

REQ-kibi-kb-lifecycle-integrity has kb_check report every finding under a stable rule name an agent can filter on: the evidence floor that arrived with KB schema 11, the origin review rules, the policy rules, the symbol granularity rule, the acknowledged supersede rule and the note a scoped check adds when it leaves quality rules out. They are stated here so every name is proved against its constant.

## Why this changed

Split from REQ-kibi-check-rule-names, which held eleven names declared by five modules. Each child is the set of names one check family declares, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
