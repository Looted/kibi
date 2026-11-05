---
title: kibi usage-remediation lists every unmatched event and missing evidence as exact repairs
status: open
semantic_text: A versioned kibi.telemetry-remediation.v1 report must enumerate every unmatched event behind failed or insufficient acceptance evidence. Every event remediation must identify its log line, request identifier, timestamp, tool, target, reason, repair action, session identifier, and actor identifier when available. Report items must use deterministic ordering. The usage-remediation command must render the report as machine-readable JSON or a compact table without mutating the knowledge base. Missing complete coverage evidence must remain an explicit report-level remediation instead of an empty event list.
semantic_clauses:
  - A versioned kibi.telemetry-remediation.v1 report must enumerate every unmatched event behind failed or insufficient acceptance evidence.
  - Every event remediation must identify its log line, request identifier, timestamp, tool, target, reason, repair action, session identifier, and actor identifier when available.
  - Report items must use deterministic ordering.
  - The usage-remediation command must render the report as machine-readable JSON or a compact table without mutating the knowledge base.
  - Missing complete coverage evidence must remain an explicit report-level remediation instead of an empty event list.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c795c81f40f4a666baa8470b4bc573458112c88380178888f51a96ac837ee9b5
semantic_inventory:
  - claim_key: CLAIM-968384507F407073
    claim_text: A versioned kibi.telemetry-remediation.v1 report must enumerate every unmatched event behind failed or insufficient acceptance evidence
    role: normative
    status: modeled
    span:
      start: 0
      end: 135
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-44E8E0E1CE004387
    claim_text: Every event remediation must identify its log line, request identifier, timestamp, tool, target, reason, repair action, session identifier, and actor identifier when available
    role: normative
    status: modeled
    span:
      start: 137
      end: 312
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-2438628617F9AD50
    claim_text: Report items must use deterministic ordering
    role: normative
    status: modeled
    span:
      start: 314
      end: 358
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F87DC6B7C9D3D846
    claim_text: The usage-remediation command must render the report as machine-readable JSON or a compact table without mutating the knowledge base
    role: normative
    status: modeled
    span:
      start: 360
      end: 492
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-8FC51874E4EAC91A
    claim_text: Missing complete coverage evidence must remain an explicit report-level remediation instead of an empty event list
    role: normative
    status: modeled
    span:
      start: 494
      end: 608
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-968384507F407073
  - CLAIM-44E8E0E1CE004387
  - CLAIM-2438628617F9AD50
  - CLAIM-F87DC6B7C9D3D846
  - CLAIM-8FC51874E4EAC91A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:51:09.757Z'
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
  - review:context-missing
id: REQ-kibi-telemetry-remediation-report
type: req
---
A versioned kibi.telemetry-remediation.v1 report must enumerate every unmatched event behind failed or insufficient acceptance evidence. Every event remediation must identify its log line, request identifier, timestamp, tool, target, reason, repair action, session identifier, and actor identifier when available. Report items must use deterministic ordering. The usage-remediation command must render the report as machine-readable JSON or a compact table without mutating the knowledge base. Missing complete coverage evidence must remain an explicit report-level remediation instead of an empty event list.

## Context

Each repair names the exact log event to fix, or says plainly which evidence is missing.



## Why this changed

Split from REQ-kibi-telemetry-remediation-evidence, which held three behaviors: appending diagnostic usage records, correlating evidence by session and actor, and the remediation report. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
