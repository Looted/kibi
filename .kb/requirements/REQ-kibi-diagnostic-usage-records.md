---
title: Diagnostic mode appends equivalent CLI and MCP usage records that keep session and actor identifiers
status: open
semantic_text: CLI JSON operations must append usage records whenever diagnostic mode is enabled. MCP operations must append semantically equivalent usage records whenever diagnostic mode is enabled. Every usage record must preserve a supplied opaque session identifier. Every usage record must preserve a supplied opaque actor identifier.
semantic_clauses:
  - CLI JSON operations must append usage records whenever diagnostic mode is enabled.
  - MCP operations must append semantically equivalent usage records whenever diagnostic mode is enabled.
  - Every usage record must preserve a supplied opaque session identifier.
  - Every usage record must preserve a supplied opaque actor identifier.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0fae04c8b209af0f056369d0759f183ff4d4f9579bc97ee03d6926d2605d5248
semantic_inventory:
  - claim_key: CLAIM-0C5979325EE650A4
    claim_text: CLI JSON operations must append usage records whenever diagnostic mode is enabled
    role: normative
    status: modeled
    span:
      start: 0
      end: 81
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B6D1D0E8523E8A43
    claim_text: MCP operations must append semantically equivalent usage records whenever diagnostic mode is enabled
    role: normative
    status: modeled
    span:
      start: 83
      end: 183
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-D97FC63F60120EFC
    claim_text: Every usage record must preserve a supplied opaque session identifier
    role: normative
    status: modeled
    span:
      start: 185
      end: 254
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-CDA785CDD47FBA8A
    claim_text: Every usage record must preserve a supplied opaque actor identifier
    role: normative
    status: modeled
    span:
      start: 256
      end: 323
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-0C5979325EE650A4
  - CLAIM-B6D1D0E8523E8A43
  - CLAIM-D97FC63F60120EFC
  - CLAIM-CDA785CDD47FBA8A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:48:52.992Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - telemetry
  - diagnostics
  - remediation
  - correlation
  - cli
  - mcp
id: REQ-kibi-diagnostic-usage-records
type: req
---
CLI JSON operations must append usage records whenever diagnostic mode is enabled. MCP operations must append semantically equivalent usage records whenever diagnostic mode is enabled. Every usage record must preserve a supplied opaque session identifier. Every usage record must preserve a supplied opaque actor identifier.

## Context

The same operation run through the CLI or MCP leaves the same usage record, so later evidence checks read one shape.



## Why this changed

Split from REQ-kibi-telemetry-remediation-evidence, which held three behaviors: appending diagnostic usage records, correlating evidence by session and actor, and the remediation report. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
