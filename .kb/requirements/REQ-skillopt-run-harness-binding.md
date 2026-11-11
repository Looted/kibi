---
title: SkillOpt binds each run and its evidence to one harness and refuses evidence from another harness
status: open
semantic_text: SkillOpt must run every cell of a run on the agent harness chosen for that run before it starts. Each run must record its harness and the harness CLI version in the campaign record, the evaluation context and the package receipt. Confirm and package must refuse evidence produced on a different harness before any artifact or paid preparation.
semantic_clauses:
  - SkillOpt must run every cell of a run on the agent harness chosen for that run before it starts
  - Each run must record its harness and the harness CLI version in the campaign record, the evaluation context and the package receipt
  - Confirm and package must refuse evidence produced on a different harness before any artifact or paid preparation
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 18566cfb9cc6872e1f07c71814d94f6c415eab7f3c6e7143e6bb905fee0510fd
semantic_inventory:
  - claim_key: CLAIM-9BEF03F5EEE96A3C
    claim_text: SkillOpt must run every cell of a run on the agent harness chosen for that run before it starts
    role: normative
    status: modeled
    span:
      start: 0
      end: 95
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-80E2220C68C6E70C
    claim_text: Each run must record its harness and the harness CLI version in the campaign record, the evaluation context and the package receipt
    role: normative
    status: modeled
    span:
      start: 97
      end: 228
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-13BF49C39258644F
    claim_text: Confirm and package must refuse evidence produced on a different harness before any artifact or paid preparation
    role: normative
    status: modeled
    span:
      start: 230
      end: 342
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-9BEF03F5EEE96A3C
  - CLAIM-80E2220C68C6E70C
  - CLAIM-13BF49C39258644F
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:28:28.828Z'
priority: must
firmness: firm
tags:
  - skillopt
  - harness
  - evaluation
id: REQ-skillopt-run-harness-binding
type: req
---
SkillOpt must run every cell of a run on the agent harness chosen for that run before it starts. Each run must record its harness and the harness CLI version in the campaign record, the evaluation context and the package receipt. Confirm and package must refuse evidence produced on a different harness before any artifact or paid preparation.

## Context

Scores from different harnesses are not comparable, so the harness and its CLI version travel with every record, and confirm and package refuse evidence from another harness before spending anything.

SkillOpt compares skill revisions by running agents on them, so its results only mean something when every cell ran on the same harness, adoption is gated on reviewed evidence, and the feedback the optimizer sees is public.

## Why this changed

Split from REQ-skillopt-host-neutral-optimization, which held four behaviors: binding a run and its evidence to one harness, gating candidate adoption, reporting the first missing protocol call, and the offline contract shape. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
