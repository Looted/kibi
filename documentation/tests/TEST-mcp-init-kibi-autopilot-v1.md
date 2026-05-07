---
id: TEST-mcp-init-kibi-autopilot-v1
title: "MCP-Owned /init-kibi Autopilot Automated Verification"
status: pending
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-05-05T00:00:00Z
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

Automated verification for the interactive `/init-kibi` bootstrap includes:

1. **Interactive Workflow Test**: Verify that the `/init-kibi` prompt block instructs the agent to ask at most 4 bounded questions to gather declared context.
2. **Read-Only Synthesis Test**: Verify that the `kb_autopilot_generate` tool correctly synthesizes candidate entities from declared context and codebase evidence without performing any writes.
3. **Declared vs. Evidence Grounding Test**: Verify that synthesized candidates prioritize source evidence while remaining grounded in user-declared intent.
4. **Preview and Approval Test**: Verify that the workflow requires a user-facing preview and explicit approval before any `kb_upsert` calls are made.
5. **Sequential Application Test**: Verify that approved candidates are applied using `kb_upsert` in a deterministic, sequential order, followed by a full `kb_check`.
6. **No-Prerequisite Bootstrap Test**: Verify that the bootstrap workflow produces a structured onboarding result even in repositories without existing `.kb/` or `documentation/` structures.
7. **MCP-Only Policy Test**: Verify that no agent-facing text suggests direct `kibi` CLI usage for maintenance or initialization.
