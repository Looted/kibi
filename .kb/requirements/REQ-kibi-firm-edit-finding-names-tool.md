---
title: The unreviewed firm-edit finding names the receipt tool and its CLI route
status: open
priority: should
required_evidence: tested
semantic_text: The firm_edit_unreviewed finding must name kb_review_firm_edit with the exact input to send, and give kibi review-firm-edit --input - as the route when MCP is not available.
tags:
  - firmness
  - check
  - mcp
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-17): "The firm_edit_unreviewed finding must name kb_review_firm_edit with the exact input to send, and give kibi review-firm-edit --input - as the route when MCP is not available."'
  recorded_at: '2026-11-17T15:35:37.788Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3a1ec4f12a7d471e214bf7ce84160ad8fcd3be7fd9bbd3bbe59f620280527a93
semantic_inventory:
  - claim_key: CLAIM-5EC30F5C6E274B1C
    claim_text: The firm_edit_unreviewed finding must name kb_review_firm_edit with the exact input to send, and give kibi review-firm-edit --input - as the route when MCP is not available
    role: normative
    status: modeled
    span:
      start: 0
      end: 172
logic_claims:
  - CLAIM-5EC30F5C6E274B1C
id: REQ-kibi-firm-edit-finding-names-tool
type: req
---
The firm_edit_unreviewed finding must name kb_review_firm_edit with the exact input to send, and give kibi review-firm-edit --input - as the route when MCP is not available.

## Context

The staged firm-edit gate (REQ-kibi-staged-firm-edit-gate) blocks a commit that edits code implementing a current firm requirement until a keeps receipt exists. Its finding used to name only the CLI route. In benchmark sessions where the agent could not run the project CLI, it looped looking for a way to record the receipt and asked the person again, which cost more turns than any other single cause of Kibi's extra cost. The receipt is now an MCP tool (REQ-kibi-firm-edit-receipts), so the finding names that tool first and keeps the CLI route for sessions without MCP.

## Source

> Maintainer decision, 2026-11-17, approving the firm-edit receipt over MCP statements: "Approve"
