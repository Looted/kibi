---
title: Every SkillOpt harness feeds the same scorers, evidence replay and leak scans
status: open
semantic_text: Every supported harness must feed the same scorers, evidence replay and leak scans.
semantic_clauses:
  - Every supported harness must feed the same scorers, evidence replay and leak scans
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b7236180aebf066a7b1aa9a866a38090fc8720442bc022925d92834876ce34c9
semantic_inventory:
  - claim_key: CLAIM-F5CC69E60EB0C987
    claim_text: Every supported harness must feed the same scorers, evidence replay and leak scans
    role: normative
    status: modeled
    span:
      start: 0
      end: 82
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F5CC69E60EB0C987
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:54:12.395Z'
priority: must
required_evidence: tested
tags:
  - skillopt
  - harness
  - evaluation
  - scoring
id: REQ-skillopt-harness-shared-scoring
type: req
---
Every supported harness must feed the same scorers, evidence replay and leak scans.

## Context

Each harness's output is normalized into one episode format before scoring, so a hidden-data leak or protocol miss is caught the same way whichever harness ran the cell.

SkillOpt runs on more than one agent harness, so the operator's choice must be honoured exactly and no harness may be scored more leniently than another.

## Why this changed

Split from REQ-skillopt-operator-selected-harness, which held two behaviors: which harness a run uses and which selections are refused, and holding every harness to the same scoring. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
