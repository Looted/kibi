---
id: REQ-kibi-telemetry-remediation-evidence
title: Diagnostic telemetry identifies exact evidence repairs across CLI and MCP
status: open
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-telemetry-remediation-evidence.md
priority: must
tags: [telemetry, diagnostics, remediation, correlation, cli, mcp]
logic_claims:
  - CLAIM-0C5979325EE650A4
  - CLAIM-B6D1D0E8523E8A43
  - CLAIM-D97FC63F60120EFC
  - CLAIM-CDA785CDD47FBA8A
  - CLAIM-F103B7734DDF4FD9
  - CLAIM-A5586B623795B679
  - CLAIM-968384507F407073
  - CLAIM-44E8E0E1CE004387
  - CLAIM-2438628617F9AD50
  - CLAIM-F87DC6B7C9D3D846
  - CLAIM-8FC51874E4EAC91A
semantic_clauses:
  - CLI JSON operations must append usage records whenever diagnostic mode is enabled
  - MCP operations must append semantically equivalent usage records whenever diagnostic mode is enabled
  - Every usage record must preserve a supplied opaque session identifier
  - Every usage record must preserve a supplied opaque actor identifier
  - Correlation for advisor evidence must require matching session and actor identifiers when both records expose them
  - Correlation for preflight evidence must require matching session and actor identifiers when both records expose them
  - A versioned kibi.telemetry-remediation.v1 report must enumerate every unmatched event behind failed or insufficient acceptance evidence
  - Every event remediation must identify its log line, request identifier, timestamp, tool, target, reason, repair action, session identifier, and actor identifier when available
  - Report items must use deterministic ordering
  - The usage-remediation command must render the report as machine-readable JSON or a compact table without mutating the knowledge base
  - Missing complete coverage evidence must remain an explicit report-level remediation instead of an empty event list
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 13e5626572ca67bc67c2f3618f6af96578c8a947f8da587663dfaddf40c819dc
semantic_inventory:
  - claim_key: CLAIM-0C5979325EE650A4
    claim_text: CLI JSON operations must append usage records whenever diagnostic mode is enabled
    role: normative
    status: modeled
    span: {start: 0, end: 81}
  - claim_key: CLAIM-B6D1D0E8523E8A43
    claim_text: MCP operations must append semantically equivalent usage records whenever diagnostic mode is enabled
    role: normative
    status: modeled
    span: {start: 83, end: 183}
  - claim_key: CLAIM-D97FC63F60120EFC
    claim_text: Every usage record must preserve a supplied opaque session identifier
    role: normative
    status: modeled
    span: {start: 185, end: 254}
  - claim_key: CLAIM-CDA785CDD47FBA8A
    claim_text: Every usage record must preserve a supplied opaque actor identifier
    role: normative
    status: modeled
    span: {start: 256, end: 323}
  - claim_key: CLAIM-F103B7734DDF4FD9
    claim_text: Correlation for advisor evidence must require matching session and actor identifiers when both records expose them
    role: normative
    status: modeled
    span: {start: 325, end: 439}
  - claim_key: CLAIM-A5586B623795B679
    claim_text: Correlation for preflight evidence must require matching session and actor identifiers when both records expose them
    role: normative
    status: modeled
    span: {start: 441, end: 557}
  - claim_key: CLAIM-968384507F407073
    claim_text: A versioned kibi.telemetry-remediation.v1 report must enumerate every unmatched event behind failed or insufficient acceptance evidence
    role: normative
    status: modeled
    span: {start: 559, end: 694}
  - claim_key: CLAIM-44E8E0E1CE004387
    claim_text: Every event remediation must identify its log line, request identifier, timestamp, tool, target, reason, repair action, session identifier, and actor identifier when available
    role: normative
    status: modeled
    span: {start: 696, end: 871}
  - claim_key: CLAIM-2438628617F9AD50
    claim_text: Report items must use deterministic ordering
    role: normative
    status: modeled
    span: {start: 873, end: 917}
  - claim_key: CLAIM-F87DC6B7C9D3D846
    claim_text: The usage-remediation command must render the report as machine-readable JSON or a compact table without mutating the knowledge base
    role: normative
    status: modeled
    span: {start: 919, end: 1051}
  - claim_key: CLAIM-8FC51874E4EAC91A
    claim_text: Missing complete coverage evidence must remain an explicit report-level remediation instead of an empty event list
    role: normative
    status: modeled
    span: {start: 1053, end: 1167}
links:
  - type: depends_on
    target: REQ-kibi-telemetry-acceptance-gate
  - type: depends_on
    target: REQ-kibi-operation-interface-parity
  - type: specified_by
    target: SCEN-kibi-telemetry-remediation-evidence
  - type: requires_predicate
    target: FACT-TELEM-CLI-LOGGING
  - type: requires_predicate
    target: FACT-TELEM-MCP-LOGGING
  - type: requires_predicate
    target: FACT-TELEM-SESSION
  - type: requires_predicate
    target: FACT-TELEM-ACTOR
  - type: requires_predicate
    target: FACT-TELEM-ADVISOR-CORRELATION
  - type: requires_predicate
    target: FACT-TELEM-PREFLIGHT-CORRELATION
  - type: requires_predicate
    target: FACT-TELEM-REPORT-CONTRACT
  - type: requires_predicate
    target: FACT-TELEM-EVENT-FIELDS
  - type: requires_predicate
    target: FACT-TELEM-ORDERING
  - type: requires_predicate
    target: FACT-TELEM-COMMAND
  - type: requires_predicate
    target: FACT-TELEM-MISSING-COVERAGE
---

CLI JSON operations must append usage records whenever diagnostic mode is enabled. MCP operations must append semantically equivalent usage records whenever diagnostic mode is enabled. Every usage record must preserve a supplied opaque session identifier. Every usage record must preserve a supplied opaque actor identifier. Correlation for advisor evidence must require matching session and actor identifiers when both records expose them. Correlation for preflight evidence must require matching session and actor identifiers when both records expose them. A versioned kibi.telemetry-remediation.v1 report must enumerate every unmatched event behind failed or insufficient acceptance evidence. Every event remediation must identify its log line, request identifier, timestamp, tool, target, reason, repair action, session identifier, and actor identifier when available. Report items must use deterministic ordering. The usage-remediation command must render the report as machine-readable JSON or a compact table without mutating the knowledge base. Missing complete coverage evidence must remain an explicit report-level remediation instead of an empty event list.
