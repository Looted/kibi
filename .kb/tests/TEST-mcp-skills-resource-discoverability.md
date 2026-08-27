---
id: TEST-mcp-skills-resource-discoverability
title: Verify MCP bundled skill resource discovery
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: packages/mcp/tests/tools/skills.test.ts
links:
  - type: validates
    target: SCEN-mcp-skills-resource-discoverability
type: test
---

List bundled skills, load a declared resource, and attempt an undeclared path while asserting deterministic success and rejection behavior. Executable coverage spans `packages/mcp/tests/tools/skills.test.ts`.
