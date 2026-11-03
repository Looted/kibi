---
title: Telemetry shows where agents struggle using fixed signals only
status: open
priority: should
required_evidence: tested
tags:
  - telemetry
  - privacy
  - agent-core
  - cli
  - mcp
semantic_text: A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns. A field name that no Kibi schema defines shall be sent as other. A telemetry event for an upsert shall report its attempt number on the same entity. A telemetry event for a search shall report its bucketed result count and whether it abstained. A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages. Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes.
semantic_clauses:
  - A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns.
  - A field name that no Kibi schema defines shall be sent as other.
  - A telemetry event for an upsert shall report its attempt number on the same entity.
  - A telemetry event for a search shall report its bucketed result count and whether it abstained.
  - A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages.
  - Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-03: "Also add meaningful data to reporting so we can see where the agents struggle and what are the pain points in current kibi implementation." Constraint: "We don''t want to see clients actual data (as this would be against GDPR)."'
  approved_by: maintainer
  recorded_at: '2026-11-03T14:22:36.175Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9f7aa8e9b4ad94681a51c4ca21cfa18396c6b74e269076e5c0bb0897d74a4a6d
semantic_inventory:
  - claim_key: CLAIM-F6134A330752A6E4
    claim_text: A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns
    role: normative
    status: modeled
    span:
      start: 0
      end: 106
  - claim_key: CLAIM-58950A6793B032A0
    claim_text: A field name that no Kibi schema defines shall be sent as other
    role: normative
    status: modeled
    span:
      start: 108
      end: 171
  - claim_key: CLAIM-C2ACCA1C21E6D451
    claim_text: A telemetry event for an upsert shall report its attempt number on the same entity
    role: normative
    status: modeled
    span:
      start: 173
      end: 255
  - claim_key: CLAIM-62809A909CC545F5
    claim_text: A telemetry event for a search shall report its bucketed result count and whether it abstained
    role: normative
    status: modeled
    span:
      start: 257
      end: 351
  - claim_key: CLAIM-AA19A95F6762621C
    claim_text: A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages
    role: normative
    status: modeled
    span:
      start: 353
      end: 442
  - claim_key: CLAIM-F3258F2810B8E57E
    claim_text: Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes
    role: normative
    status: modeled
    span:
      start: 444
      end: 540
logic_claims:
  - CLAIM-F6134A330752A6E4
  - CLAIM-58950A6793B032A0
  - CLAIM-C2ACCA1C21E6D451
  - CLAIM-62809A909CC545F5
  - CLAIM-AA19A95F6762621C
  - CLAIM-F3258F2810B8E57E
id: REQ-kibi-telemetry-agent-signals
type: req
---
A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns. A field name that no Kibi schema defines shall be sent as other. A telemetry event for an upsert shall report its attempt number on the same entity. A telemetry event for a search shall report its bucketed result count and whether it abstained. A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages. Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes.

## Context

The maintainer asked for telemetry that shows where agents struggle with Kibi and what the pain points of the current implementation are, without sending any customer data. Before this, a refused upsert said only that validation failed, so nobody could tell which rule or field agents get wrong, whether they retry, whether they loaded a Kibi skill first, or how their searches end; crashes carried no location at all. These signals use fixed vocabulary only: JSON Schema keywords and Kibi check names as rules, Kibi schema field paths with invented names sent as `other`, bucketed counts and booleans, and stack frames only from Kibi's own packages without paths or lines. Retries, repeated searches and skill loads are recognised from one-way hashes kept next to the local telemetry queue. The maintainer chose to ship this with the outcome split (REQ-kibi-telemetry-expected-outcomes) as one change.

## Source

Maintainer request, 2026-11-03: "Also add meaningful data to reporting so we can see where the agents struggle and what are the pain points in current kibi implementation." Then: "We don't want to see clients actual data (as this would be against GDPR)." The maintainer chose "One PR" for the outcome split, struggle signals, search fields and crash reports.