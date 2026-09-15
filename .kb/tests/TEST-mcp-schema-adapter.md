---
title: MCP JSON Schema to Zod conversion preserves validation behavior
status: passing
verification_scope: unit
verification_perspective: internal
tags:
  - test-quality
  - regression
  - internal
id: TEST-mcp-schema-adapter
type: test
---
Runs packages/mcp/tests/server/json-schema-to-zod-remaining.coverage.test.ts. Exercises allOf, enum holes, unknown schema descriptions, fallback values, and converted schema validation. Unit evidence for the MCP operation schema adapter.