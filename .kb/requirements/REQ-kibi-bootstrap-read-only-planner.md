---
title: The bootstrap planner returns a deterministic, read-only, hash-bound plan
status: open
semantic_text: Public interfaces must use canonical plan-bootstrap and kb_plan_bootstrap names without legacy aliases. The planner must return a deterministic read-only hash-bound plan with exact branch, KB, workspace, and source evidence bindings and bounded context questions. Status and next actions must classify thin, seeded, degraded, and repair-required states consistently.
semantic_clauses:
  - Public interfaces must use canonical plan-bootstrap and kb_plan_bootstrap names without legacy aliases.
  - The planner must return a deterministic read-only hash-bound plan with exact branch, KB, workspace, and source evidence bindings and bounded context questions.
  - Status and next actions must classify thin, seeded, degraded, and repair-required states consistently.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 337cec64cd999b17341039c8f0ccc05d6ce1d5b7025eecfd8a34e5fe220d7f62
semantic_inventory:
  - claim_key: CLAIM-5B1AC90906AE403D
    claim_text: Public interfaces must use canonical plan-bootstrap and kb_plan_bootstrap names without legacy aliases
    role: normative
    status: modeled
    span:
      start: 0
      end: 102
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-0D02947169FC8F33
    claim_text: The planner must return a deterministic read-only hash-bound plan with exact branch, KB, workspace, and source evidence bindings and bounded context questions
    role: normative
    status: modeled
    span:
      start: 104
      end: 262
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-FA953357BC2B9A7B
    claim_text: Status and next actions must classify thin, seeded, degraded, and repair-required states consistently
    role: normative
    status: modeled
    span:
      start: 264
      end: 365
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5B1AC90906AE403D
  - CLAIM-0D02947169FC8F33
  - CLAIM-FA953357BC2B9A7B
firmness: firm
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T04:29:48.196Z'
id: REQ-kibi-bootstrap-read-only-planner
type: req
---
Public interfaces must use canonical plan-bootstrap and kb_plan_bootstrap names without legacy aliases. The planner must return a deterministic read-only hash-bound plan with exact branch, KB, workspace, and source evidence bindings and bounded context questions. Status and next actions must classify thin, seeded, degraded, and repair-required states consistently.

## Context

A person approves exactly the plan they read, because its hash binds the branch, KB, workspace and evidence it was built from.



## Why this changed

Split from REQ-KIBI-BOOTSTRAP-PLAN, which held four behaviors: initialization, seeding and handoff; the read-only hash-bound planner; approved sequential apply with a repair journal; and adapters that share the planner. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
