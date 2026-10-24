---
title: MCP answers a coded tool failure with the error envelope the CLI returns
status: open
required_evidence: tested
tags:
  - mcp
  - cli
  - parity
  - errors
priority: must
origin:
  kind: agent
  ref: Onboarding test finding on MCP error codes (2026-10-14)
  recorded_at: '2026-10-14T08:57:09.019Z'
semantic_text: The MCP server must answer a tool call that fails with a Kibi error code with an error envelope that carries the code, the message and the retryability. The MCP server must report the same error code, message and retryability for that failure as the CLI JSON route.
logic_claims:
  - CLAIM-5675365464CCAF0D
  - CLAIM-7C629CA860D63D6D
semantic_clauses:
  - The MCP server must answer a tool call that fails with a Kibi error code with an error envelope that carries the code, the message and the retryability
  - The MCP server must report the same error code, message and retryability for that failure as the CLI JSON route
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: The MCP reference promises error codes such as VALIDATION_FAILED, but a thrown coded error reached MCP clients only as plain text without structuredContent.
semantic_source_hash: 09da99515f8a7e50d7b400f6b9a6d2ef0143dda54cfc5fe2533808270feda9b9
semantic_inventory:
  - claim_key: CLAIM-5675365464CCAF0D
    claim_text: The MCP server must answer a tool call that fails with a Kibi error code with an error envelope that carries the code, the message and the retryability
    role: normative
    status: modeled
    span:
      start: 0
      end: 151
  - claim_key: CLAIM-7C629CA860D63D6D
    claim_text: The MCP server must report the same error code, message and retryability for that failure as the CLI JSON route
    role: normative
    status: modeled
    span:
      start: 153
      end: 264
id: REQ-mcp-coded-error-envelope
type: req
---
The MCP server must answer a tool call that fails with a Kibi error code with an error envelope that carries the code, the message and the retryability. The MCP server must report the same error code, message and retryability for that failure as the CLI JSON route.

## Context

An onboarding test on a test project sent kb_compile_intent a clause that was not a verbatim fragment of the intent. The handler threw an InputError with VALIDATION_FAILED, as the MCP reference documents, but the MCP server rethrew it as a plain Error, so the client saw only the text "Tool kb_compile_intent failed: ..." with no structuredContent and no code to branch on, while the CLI JSON route printed the coded envelope for the same input. The same loss applied to every thrown InputError and OperationError. Errors without a Kibi code keep failing the tool as before.
