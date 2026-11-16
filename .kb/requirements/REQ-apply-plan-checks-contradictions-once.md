---
title: kb_apply_plan checks contradictions once for the whole plan
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - upsert
  - sibling-requirements
semantic_text: kb_apply_plan must run the contradiction check once, after every step of the plan is staged.
rationale: The refusal tells the agent to change the conflicting requirement in the same kb_apply_plan. A check after each step would refuse the first step of exactly that plan, so the advice would deadlock a legitimate change to two requirements.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T19:17:10.060Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2c0e7f38beab73b9edf16199d787bc50f4449c589daec591ffbea7134e243111
semantic_inventory:
  - claim_key: CLAIM-EEEEAB199692F8D8
    claim_text: kb_apply_plan must run the contradiction check once, after every step of the plan is staged
    role: normative
    status: modeled
    span:
      start: 0
      end: 91
logic_claims:
  - CLAIM-EEEEAB199692F8D8
id: REQ-apply-plan-checks-contradictions-once
type: req
---
kb_apply_plan must run the contradiction check once, after every step of the plan is staged.

## Context

The refusal tells the agent to change the conflicting requirement in the same kb_apply_plan. A check after each step would refuse the first step of exactly that plan, so the advice would deadlock a legitimate change to two requirements.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"