---
title: SkillOpt reports infrastructure failures as a structured no-go and sends only complete matrices to verdict review
status: open
semantic_text: 'Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review. Only a complete matrix may reach external-verdict review.'
semantic_clauses:
  - 'Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review'
  - Only a complete matrix may reach external-verdict review
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0ee0dde180f4273383206373c2506c1a46347bbcc285898af11e64d3031e99a5
semantic_inventory:
  - claim_key: CLAIM-B9D5C4F3DA7528E2
    claim_text: 'Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review'
    role: normative
    status: modeled
    span:
      start: 0
      end: 301
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-EE241F293DB8EE4F
    claim_text: Only a complete matrix may reach external-verdict review
    role: normative
    status: modeled
    span:
      start: 303
      end: 359
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-B9D5C4F3DA7528E2
  - CLAIM-EE241F293DB8EE4F
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:56:20.666Z'
priority: must
firmness: firm
required_evidence: tested
tags:
  - skillopt
  - evaluation
  - infrastructure
id: REQ-skillopt-infrastructure-failure-no-go
type: req
---
Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review. Only a complete matrix may reach external-verdict review.

## Context

A missing executable, interruption, exhausted budget or evidence conflict says nothing about the skill, so it ends the run with a structured no-go instead of an eligibility verdict, and an incomplete matrix never reaches review.

SkillOpt can rewrite the skills Kibi ships, so a production change needs a verdict SkillOpt cannot produce for itself, and a run that broke for infrastructure reasons must never read as a behavioral result.

## Why this changed

Split from REQ-skillopt-external-adoption-verdict, which held two behaviors: production adoption only after an independently verified external verdict, and keeping infrastructure failures and incomplete matrices out of that review. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
