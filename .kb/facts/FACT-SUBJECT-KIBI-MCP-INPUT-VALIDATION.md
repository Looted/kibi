---
title: Kibi MCP input validation
status: active
fact_kind: subject
subject_key: kibi.mcp_input_validation
canonical_key: kibi.mcp_input_validation
text_ref: .kb/requirements/REQ-mcp-conditional-input-validation.md
tags:
  - lane:strict
  - mcp
  - validation
  - facts
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:12.250Z'
id: FACT-SUBJECT-KIBI-MCP-INPUT-VALIDATION
type: fact
---

Validation of tool input on the MCP server, which must evaluate the same schema rules as the CLI, including oneOf guard branches and conditional rules such as which fact kinds may quote claim text without a claim key. It is input shape, not semantic checks.
