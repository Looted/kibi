---
title: Kibi init attaches the branch, an explicit bootstrap request seeds, and seeded repositories hand off
status: open
semantic_text: Kibi initialization must attach the exact Git branch and create infrastructure only. An explicit bootstrap request must perform initial inference and seed through kibi-bootstrap, then seeded repositories must hand off to normal Kibi work. Generic onboarding must direct agents through typed status and canonical kibi-usage, kibi-freshness, kibi-traceability, and kibi-bootstrap skills without manual .kb edits.
semantic_clauses:
  - Kibi initialization must attach the exact Git branch and create infrastructure only.
  - An explicit bootstrap request must perform initial inference and seed through kibi-bootstrap, then seeded repositories must hand off to normal Kibi work.
  - Generic onboarding must direct agents through typed status and canonical kibi-usage, kibi-freshness, kibi-traceability, and kibi-bootstrap skills without manual .kb edits.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 96e59f7f5ac39d4a337217b7ced9b0208901a63d91288e0eabcd3b4b1414d24b
semantic_inventory:
  - claim_key: CLAIM-BFD7680847E0AD7D
    claim_text: Kibi initialization must attach the exact Git branch and create infrastructure only
    role: normative
    status: modeled
    span:
      start: 0
      end: 83
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-AAD92792B8861C87
    claim_text: An explicit bootstrap request must perform initial inference and seed through kibi-bootstrap, then seeded repositories must hand off to normal Kibi work
    role: normative
    status: modeled
    span:
      start: 85
      end: 237
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-61445B78B6F47665
    claim_text: Generic onboarding must direct agents through typed status and canonical kibi-usage, kibi-freshness, kibi-traceability, and kibi-bootstrap skills without manual .kb edits
    role: normative
    status: modeled
    span:
      start: 239
      end: 409
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-BFD7680847E0AD7D
  - CLAIM-AAD92792B8861C87
  - CLAIM-61445B78B6F47665
firmness: firm
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T04:28:56.128Z'
tags:
  - review:context-missing
id: REQ-kibi-bootstrap-seed-and-handoff
type: req
---
Kibi initialization must attach the exact Git branch and create infrastructure only. An explicit bootstrap request must perform initial inference and seed through kibi-bootstrap, then seeded repositories must hand off to normal Kibi work. Generic onboarding must direct agents through typed status and canonical kibi-usage, kibi-freshness, kibi-traceability, and kibi-bootstrap skills without manual .kb edits.

## Context

A repository is bootstrapped once, on request, and seeded knowledge then grows through normal Kibi work.



## Why this changed

Split from REQ-KIBI-BOOTSTRAP-PLAN, which held four behaviors: initialization, seeding and handoff; the read-only hash-bound planner; approved sequential apply with a repair journal; and adapters that share the planner. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
