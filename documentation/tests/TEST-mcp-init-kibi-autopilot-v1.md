---
id: TEST-mcp-init-kibi-autopilot-v1
title: "MCP-Owned /init-kibi Autopilot Automated Verification"
status: pending
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
source: documentation/tests/TEST-mcp-init-kibi-autopilot-v1.md
priority: must
tags:
  - test
  - autopilot
  - init-kibi
links:
  - type: validates
    target: SCEN-mcp-init-kibi-autopilot-v1
---

Automated verification for the MCP-owned `/init-kibi` Autopilot includes:

1. **Tool Registration Test**: Verify that the `kb_autopilot_generate` tool is correctly registered in the Kibi MCP server and its schema matches the requirement.
2. **Read-Only Guarantee Test**: Verify that `kb_autopilot_generate` does not modify any files (no `kb_upsert` calls or file writes) even when it finds valid candidates.
3. **Activation State Test**: Verify that `kb_autopilot_generate` correctly identifies and acts upon `root_uninitialized` and `root_partial` postures, returning an error or empty result for `root_active`.
4. **Candidate Generation Prompt Content Test**: Verify that the generated `plan` and `candidates` correctly reflect the existing documentation structure in a sample repository.
5. **Prompt Policy Compliance Test**: Verify that the generated plan does not contain direct CLI commands or suggest background-apply workflows.
6. **Integration Test with kb_upsert**: Verify that the structured output from `kb_autopilot_generate` is directly compatible with `kb_upsert` input schema.
