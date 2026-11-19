---
title: An MCP tool result and the CLI JSON result carry the same data
status: open
priority: must
required_evidence: tested
semantic_text: An MCP tool result and the CLI JSON result of the same call must carry the same data.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f8e66108d0681320d27a3d2cf1a874027035fc439c35f1f375245b7f975be065
semantic_inventory:
  - claim_key: CLAIM-4A0E9621569BCC52
    claim_text: An MCP tool result and the CLI JSON result of the same call must carry the same data
    role: normative
    status: modeled
    span:
      start: 0
      end: 84
logic_claims:
  - CLAIM-4A0E9621569BCC52
rationale: Agents use whichever route their host offers; a cut that differed between them would make the same question give different answers.
id: REQ-result-route-parity
type: req
---
An MCP tool result and the CLI JSON result of the same call must carry the same data.

## Why

Agents use whichever route their host offers; a cut that differed between them would make the same question give different answers.

## Context

budgetedToolResult (MCP) and budgetedOperationResult (CLI JSON route) both call fitOperationResult, and the parity test compares a cut kb_query over both routes.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.
