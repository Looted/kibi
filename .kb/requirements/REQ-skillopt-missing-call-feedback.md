---
title: SkillOpt records the first missing required MCP call and feeds it back publicly without private content
status: open
semantic_text: A cell receipt with zero protocol points must record the first missing required MCP call as a public tool name and position. Public feedback for the next revision must carry that missing call without call arguments, task identifiers or private evaluator content.
semantic_clauses:
  - A cell receipt with zero protocol points must record the first missing required MCP call as a public tool name and position
  - Public feedback for the next revision must carry that missing call without call arguments, task identifiers or private evaluator content
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a2bf40db1ed026b2e24c9edc17ce3c2a9ffe88b364c4c6134e781feedb78f4cc
semantic_inventory:
  - claim_key: CLAIM-73539D9504DAEC97
    claim_text: A cell receipt with zero protocol points must record the first missing required MCP call as a public tool name and position
    role: normative
    status: modeled
    span:
      start: 0
      end: 123
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F40BEC0A4F9DF19A
    claim_text: Public feedback for the next revision must carry that missing call without call arguments, task identifiers or private evaluator content
    role: normative
    status: modeled
    span:
      start: 125
      end: 261
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-73539D9504DAEC97
  - CLAIM-F40BEC0A4F9DF19A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:30:42.734Z'
priority: must
firmness: firm
tags:
  - skillopt
  - feedback
  - evaluation
id: REQ-skillopt-missing-call-feedback
type: req
---
A cell receipt with zero protocol points must record the first missing required MCP call as a public tool name and position. Public feedback for the next revision must carry that missing call without call arguments, task identifiers or private evaluator content.

## Context

A cell that scores zero protocol points tells the next revision which call it skipped, by public tool name and position only, so the optimizer learns from it without seeing private task or evaluator content.

SkillOpt compares skill revisions by running agents on them, so its results only mean something when every cell ran on the same harness, adoption is gated on reviewed evidence, and the feedback the optimizer sees is public.

## Why this changed

Split from REQ-skillopt-host-neutral-optimization, which held four behaviors: binding a run and its evidence to one harness, gating candidate adoption, reporting the first missing protocol call, and the offline contract shape. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
