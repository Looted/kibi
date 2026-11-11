---
title: Telemetry reports retries and search outcomes from markers kept locally as hashes
status: open
semantic_text: A telemetry event for an upsert shall report its attempt number on the same entity. A telemetry event for a search shall report its bucketed result count and whether it abstained. Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes.
semantic_clauses:
  - A telemetry event for an upsert shall report its attempt number on the same entity.
  - A telemetry event for a search shall report its bucketed result count and whether it abstained.
  - Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3fc2343f418c1c6f33020bda471bf61ba9527559662845883798cf5607eba009
semantic_inventory:
  - claim_key: CLAIM-C2ACCA1C21E6D451
    claim_text: A telemetry event for an upsert shall report its attempt number on the same entity
    role: normative
    status: modeled
    span:
      start: 0
      end: 82
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-62809A909CC545F5
    claim_text: A telemetry event for a search shall report its bucketed result count and whether it abstained
    role: normative
    status: modeled
    span:
      start: 84
      end: 178
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F3258F2810B8E57E
    claim_text: Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes
    role: normative
    status: modeled
    span:
      start: 180
      end: 276
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-C2ACCA1C21E6D451
  - CLAIM-62809A909CC545F5
  - CLAIM-F3258F2810B8E57E
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T07:00:14.865Z'
priority: should
required_evidence: tested
tags:
  - telemetry
  - privacy
  - agent-core
  - cli
  - mcp
id: REQ-kibi-telemetry-session-signals
type: req
---
A telemetry event for an upsert shall report its attempt number on the same entity. A telemetry event for a search shall report its bucketed result count and whether it abstained. Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes.

## Context

Retries and repeats are recognised from hashes in a local file, so the hashed keys never leave the machine.

The maintainer asked for telemetry that shows where agents struggle with Kibi and what the pain points of the current implementation are, without sending any customer data. Before this, a refused upsert said only that validation failed, so nobody could tell which rule or field agents get wrong, whether they retry, whether they loaded a Kibi skill first, or how their searches end; crashes carried no location at all. These signals use fixed vocabulary only: JSON Schema keywords and Kibi check names as rules, Kibi schema field paths with invented names sent as `other`, bucketed counts and booleans, and stack frames only from Kibi's own packages without paths or lines. Retries, repeated searches and skill loads are recognised from one-way hashes kept next to the local telemetry queue. The maintainer chose to ship this with the outcome split (REQ-kibi-telemetry-expected-outcomes) as one change.

## Why this changed

Split from REQ-kibi-telemetry-agent-signals, which held two behaviors: what a single event carries, and the signals that compare calls within a session. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
