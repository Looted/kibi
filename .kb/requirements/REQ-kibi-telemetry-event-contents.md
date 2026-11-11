---
title: Telemetry events name refused rules and schema fields, and carry only Kibi stack frames
status: open
semantic_text: A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns. A field name that no Kibi schema defines shall be sent as other. A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages.
semantic_clauses:
  - A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns.
  - A field name that no Kibi schema defines shall be sent as other.
  - A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0eaaf8a123dc77e742719132c51149572d00b8564710e0fe4646712e09705ea2
semantic_inventory:
  - claim_key: CLAIM-F6134A330752A6E4
    claim_text: A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns
    role: normative
    status: modeled
    span:
      start: 0
      end: 106
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-58950A6793B032A0
    claim_text: A field name that no Kibi schema defines shall be sent as other
    role: normative
    status: modeled
    span:
      start: 108
      end: 171
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-AA19A95F6762621C
    claim_text: A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages
    role: normative
    status: modeled
    span:
      start: 173
      end: 262
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F6134A330752A6E4
  - CLAIM-58950A6793B032A0
  - CLAIM-AA19A95F6762621C
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:59:05.643Z'
priority: should
required_evidence: tested
tags:
  - telemetry
  - privacy
  - agent-core
  - cli
  - mcp
id: REQ-kibi-telemetry-event-contents
type: req
---
A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns. A field name that no Kibi schema defines shall be sent as other. A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages.

## Context

Every value is fixed vocabulary, so what an agent wrote never reaches telemetry.

The maintainer asked for telemetry that shows where agents struggle with Kibi and what the pain points of the current implementation are, without sending any customer data. Before this, a refused upsert said only that validation failed, so nobody could tell which rule or field agents get wrong, whether they retry, whether they loaded a Kibi skill first, or how their searches end; crashes carried no location at all. These signals use fixed vocabulary only: JSON Schema keywords and Kibi check names as rules, Kibi schema field paths with invented names sent as `other`, bucketed counts and booleans, and stack frames only from Kibi's own packages without paths or lines. Retries, repeated searches and skill loads are recognised from one-way hashes kept next to the local telemetry queue. The maintainer chose to ship this with the outcome split (REQ-kibi-telemetry-expected-outcomes) as one change.

## Why this changed

Split from REQ-kibi-telemetry-agent-signals, which held two behaviors: what a single event carries, and the signals that compare calls within a session. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
