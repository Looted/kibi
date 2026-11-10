---
title: Bootstrap applies only an approved plan, in order, with a repair journal
status: open
semantic_text: Applying bootstrap must require explicit approval, execute dependency-ordered actions sequentially through kb_apply_plan, and never permit direct kb_upsert for bootstrap tasks. Partial application must produce a typed repair journal with action-start and post-action checkpoints, reject original-plan replay, and fail closed on changed state.
semantic_clauses:
  - Applying bootstrap must require explicit approval, execute dependency-ordered actions sequentially through kb_apply_plan, and never permit direct kb_upsert for bootstrap tasks.
  - Partial application must produce a typed repair journal with action-start and post-action checkpoints, reject original-plan replay, and fail closed on changed state.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c83d01b2a48b925c02ebaad2bb14d664d271d3abc1b9b9c7a24d3116c1999f9a
semantic_inventory:
  - claim_key: CLAIM-060359AD8D5787D9
    claim_text: Applying bootstrap must require explicit approval, execute dependency-ordered actions sequentially through kb_apply_plan, and never permit direct kb_upsert for bootstrap tasks
    role: normative
    status: modeled
    span:
      start: 0
      end: 175
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-27EF1946F8E11BF8
    claim_text: Partial application must produce a typed repair journal with action-start and post-action checkpoints, reject original-plan replay, and fail closed on changed state
    role: normative
    status: modeled
    span:
      start: 177
      end: 341
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-060359AD8D5787D9
  - CLAIM-27EF1946F8E11BF8
firmness: firm
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T04:30:57.590Z'
tags:
  - review:context-missing
id: REQ-kibi-bootstrap-approved-apply
type: req
---
Applying bootstrap must require explicit approval, execute dependency-ordered actions sequentially through kb_apply_plan, and never permit direct kb_upsert for bootstrap tasks. Partial application must produce a typed repair journal with action-start and post-action checkpoints, reject original-plan replay, and fail closed on changed state.

## Context

A partial apply leaves a journal to repair from, and nothing runs against a state the person did not approve.



## Why this changed

Split from REQ-KIBI-BOOTSTRAP-PLAN, which held four behaviors: initialization, seeding and handoff; the read-only hash-bound planner; approved sequential apply with a repair journal; and adapters that share the planner. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
