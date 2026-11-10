---
title: The HTML health report shows requirement health and escapes knowledge-base text
status: open
semantic_text: The report must show the Git branch, current requirement count, fully proven count and percentage, missing scenarios, stale end-to-end evidence, unique contradictions, unowned production symbols, and per-requirement proof stages. The report must escape knowledge-base text and work without network assets.
semantic_clauses:
  - The report must show the Git branch, current requirement count, fully proven count and percentage, missing scenarios, stale end-to-end evidence, unique contradictions, unowned production symbols, and per-requirement proof stages.
  - The report must escape knowledge-base text and work without network assets.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d8e8d6ca46fc72d548cba740a0050e000f882c8c497b37a9db8ae0c153ea8171
semantic_inventory:
  - claim_key: CLAIM-4585ACCC37C749B8
    claim_text: The report must show the Git branch, current requirement count, fully proven count and percentage, missing scenarios, stale end-to-end evidence, unique contradictions, unowned production symbols, and per-requirement proof stages
    role: normative
    status: modeled
    span:
      start: 0
      end: 228
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-59CFEDCE5CE79A3C
    claim_text: The report must escape knowledge-base text and work without network assets
    role: normative
    status: modeled
    span:
      start: 230
      end: 304
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4585ACCC37C749B8
  - CLAIM-59CFEDCE5CE79A3C
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:46:53.376Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - cli
  - report
  - html
  - coverage
  - proof
  - ci
id: REQ-kibi-health-report-content
type: req
---
The report must show the Git branch, current requirement count, fully proven count and percentage, missing scenarios, stale end-to-end evidence, unique contradictions, unowned production symbols, and per-requirement proof stages. The report must escape knowledge-base text and work without network assets.

## Context

Requirement text comes from people and agents, so the page renders it as text and loads nothing from the network.



## Why this changed

Split from REQ-kibi-html-health-report, which held three behaviors: building the report from complete data, what the report shows, and where it is written and opened. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
