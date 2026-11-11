---
title: Sync baselines legacy requirements once, then enforces ledgers on change
status: open
semantic_text: Markdown sync must baseline existing legacy requirements once, then enforce complete ledgers for new or semantically changed requirements.
semantic_clauses:
  - Markdown sync must baseline existing legacy requirements once, then enforce complete ledgers for new or semantically changed requirements
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 001e491be84310400d8f3d899e99314da7dd353a47e30a0562d7f3aa4ad208a7
semantic_inventory:
  - claim_key: CLAIM-944B73FD47FD3F8A
    claim_text: Markdown sync must baseline existing legacy requirements once, then enforce complete ledgers for new or semantically changed requirements
    role: normative
    status: modeled
    span:
      start: 0
      end: 137
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-944B73FD47FD3F8A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T05:26:35.063Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - requirements
  - semantic-inventory
  - ingestion
  - prolog
  - sync
id: REQ-kibi-legacy-ledger-baseline
type: req
---
Markdown sync must baseline existing legacy requirements once, then enforce complete ledgers for new or semantically changed requirements.

## Context

Projects that predate proposition ledgers keep working after an upgrade, but no new or reworded requirement escapes the ledger by riding on the baseline.

Proposition ledgers are what lets Kibi prove a requirement from its own words, so a ledger that skips or rebinds a sentence would let a requirement look proved while saying something else.

## Why this changed

Split from REQ-kibi-proposition-complete-ingestion, which held two behaviors: complete, source-bound proposition ledgers on every current requirement write, and the one-time legacy baseline that sync takes before enforcing them. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
