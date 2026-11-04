---
title: Telemetry reports expected refusals as rejected and keeps error for Kibi faults
status: open
priority: should
required_evidence: tested
tags:
  - telemetry
  - privacy
  - agent-core
  - cli
  - mcp
semantic_text: A telemetry event for an operation that Kibi refused on purpose shall have status rejected. A telemetry event for an operation that failed through a Kibi fault shall have status error. A telemetry event shall carry an error class name only when its status is error. A telemetry event shall carry telemetry_version 2.
semantic_clauses:
  - A telemetry event for an operation that Kibi refused on purpose shall have status rejected.
  - A telemetry event for an operation that failed through a Kibi fault shall have status error.
  - A telemetry event shall carry an error class name only when its status is error.
  - A telemetry event shall carry telemetry_version 2.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-03: "Ok, please make sure we don''t log expected outcomes as errors." Constraint, same day: "We don''t want to see clients actual data (as this would be against GDPR)."'
  approved_by: maintainer
  recorded_at: '2026-11-03T13:47:12.715Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 44d4aa7d5f4993fd15ba4cb786597af98a7463dd0b0530eaa38cf4d67eff4a8f
semantic_inventory:
  - claim_key: CLAIM-88E92DF303CAE8A7
    claim_text: A telemetry event for an operation that Kibi refused on purpose shall have status rejected
    role: normative
    status: modeled
    span:
      start: 0
      end: 90
  - claim_key: CLAIM-80FCD3E55B291BFE
    claim_text: A telemetry event for an operation that failed through a Kibi fault shall have status error
    role: normative
    status: modeled
    span:
      start: 92
      end: 183
  - claim_key: CLAIM-60101C869DB5940E
    claim_text: A telemetry event shall carry an error class name only when its status is error
    role: normative
    status: modeled
    span:
      start: 185
      end: 264
  - claim_key: CLAIM-5E42DD14622A5216
    claim_text: A telemetry event shall carry telemetry_version 2
    role: normative
    status: modeled
    span:
      start: 266
      end: 315
logic_claims:
  - CLAIM-88E92DF303CAE8A7
  - CLAIM-80FCD3E55B291BFE
  - CLAIM-60101C869DB5940E
  - CLAIM-5E42DD14622A5216
id: REQ-kibi-telemetry-expected-outcomes
type: req
---
A telemetry event for an operation that Kibi refused on purpose shall have status rejected. A telemetry event for an operation that failed through a Kibi fault shall have status error. A telemetry event shall carry an error class name only when its status is error. A telemetry event shall carry telemetry_version 2.

## Context

The maintainer found that the PostHog reliability charts counted Kibi's normal answers as failures: check findings, invalid upsert payloads, semantic contradictions, firm-decision locks and missing entities were sent with status error, and the CLI wrapped most of them as operation_failed, so real crashes could not be told apart from an agent sending a bad payload. Refusals now carry a fixed code that maps to a rejected outcome in kibi-agent-core, and faults keep status error with the JavaScript class name of the thrown error (never its message) so crash groups can be told apart. The event version marks events that use the new outcomes, so charts can split old and new data. The maintainer required that no customer data reach telemetry, so the class name is sent only when it is a plain identifier.

## Source

Maintainer request, 2026-11-03: "Ok, please make sure we don't log expected outcomes as errors. Also add meaningful data to reporting so we can see where the agents struggle and what are the pain points in current kibi implementation." Then: "We don't want to see clients actual data (as this would be against GDPR)."