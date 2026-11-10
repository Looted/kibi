---
title: Status, check and coverage expose one hash-bound migration plan without writing
status: open
semantic_text: Kibi must expose one kibi.migration-plan.v2 contract from status, check and coverage outputs. A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains. Checks and status must remain read-only.
semantic_clauses:
  - Kibi must expose one kibi.migration-plan.v2 contract from status, check and coverage outputs.
  - A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains.
  - Checks and status must remain read-only.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 39c400af27b911407239e6e6c66a1984a4b69b6d37cebce86cb09ec722de3544
semantic_inventory:
  - claim_key: CLAIM-7E4E388191530F9C
    claim_text: Kibi must expose one kibi.migration-plan.v2 contract from status, check and coverage outputs
    role: normative
    status: modeled
    span:
      start: 0
      end: 92
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-A3051C44CDE8EFB7
    claim_text: A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains
    role: normative
    status: modeled
    span:
      start: 94
      end: 245
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-1EDEF6580A6786E1
    claim_text: Checks and status must remain read-only
    role: normative
    status: modeled
    span:
      start: 247
      end: 286
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-7E4E388191530F9C
  - CLAIM-A3051C44CDE8EFB7
  - CLAIM-1EDEF6580A6786E1
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T07:07:31.486Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - cli
  - migration
  - agents
  - safety
id: REQ-kibi-migration-plan-contract
type: req
---
Kibi must expose one kibi.migration-plan.v2 contract from status, check and coverage outputs. A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains. Checks and status must remain read-only.

## Context

An agent reads the plan and its hash before anything changes, so the hash names exactly what a person approves.



## Why this changed

Split from REQ-agent-guided-migration-orchestration, which held two behaviors: the read-only, hash-bound migration plan, and the gate that applies an approved plan. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
