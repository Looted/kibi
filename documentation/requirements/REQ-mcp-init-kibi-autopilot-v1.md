---
id: REQ-mcp-init-kibi-autopilot-v1
title: "MCP-Owned /init-kibi Autopilot: Read-Only Candidate Generation for Day-0 Activation"
status: open
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
source: documentation/requirements/REQ-mcp-init-kibi-autopilot-v1.md
priority: must
owner: opencode-team
tags:
  - mcp
  - autopilot
  - init-kibi
  - bootstrap
links:
  - type: specified_by
    target: SCEN-mcp-init-kibi-autopilot-v1
  - type: verified_by
    target: TEST-mcp-init-kibi-autopilot-v1
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
  - type: relates_to
    target: REQ-opencode-agent-mcp-only
---

The Kibi MCP server must provide an Autopilot workflow for the `/init-kibi` slash command to automate initial repository bootstrapping while preserving agent safety policies.

1. **Read-Only Candidate Generation**: The MCP server must expose a read-only tool `kb_autopilot_generate` that analyzes the workspace and generates candidate Kibi entities (requirements, scenarios, tests, facts) and relationships.
2. **Day-0 Activation Focus**: Autopilot v1 must focus exclusively on "Day-0" activation—initializing a repository that has existing documentation but no Kibi knowledge base. It must not perform git-history mining or background application of changes.
3. **Candidate Schema**: The `kb_autopilot_generate` tool must return a structured payload containing:
   - `entities`: A list of candidate entities with proposed IDs, types, and properties.
   - `relationships`: A list of proposed relationships between candidates or existing entities.
   - `plan`: A human-readable summary of the proposed changes.
4. **Agent-Managed Application**: The agent must review the generated candidates and apply them using standard public MCP tools (`kb_upsert`). The MCP server must not apply changes directly.
5. **Activation States**: The tool must classify the workspace state and only generate candidates when in a `root_uninitialized` or `root_partial` posture as defined in REQ-opencode-smart-enforcement-v1.
6. **Payoff Reporting**: The tool should include a "payoff" estimate in the plan, describing the value of the proposed initialization (e.g., number of requirements linked, coverage improvements).
7. **Read-Only Guarantee**: `kb_autopilot_generate` must be strictly read-only and must not modify the `.kb` directory or any documentation files.
