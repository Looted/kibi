---
id: REQ-mcp-init-kibi-autopilot-v1
title: "MCP-Owned /init-kibi Autopilot: Read-Only Candidate Generation for Day-0 Activation"
status: open
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-05-05T00:00:00Z
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

The Kibi MCP server must provide an interactive bootstrap workflow for the `/init-kibi` slash command to onboard new repositories through bounded discovery and read-only candidate synthesis.

1. **Interactive Bootstrap Onboarding**: The `/init-kibi` workflow is defined as an interactive onboarding process. The agent must ask at most 4 bounded questions to gather declared context: project summary, primary source of truth, priority root (for monorepos), and verification/config anchors.
2. **Read-Only Candidate Synthesis**: The `kb_autopilot_generate` tool must be strictly read-only. It synthesizes candidate Kibi entities (requirements, scenarios, tests, facts) and relationships based on the declared context and existing source evidence.
3. **Declared Context vs. Verified Evidence**: The contract must distinguish between "declared context" (provided by the user via interactive questions) and "verified evidence" (discovered in the codebase). Synthesis should prioritize evidence but ground it in declared intent.
4. **Agent-Managed Preview and Approval**: Agent-managed writes to the KB may only occur after the user has previewed and approved the proposed candidates. The MCP server must not apply changes autonomously.
5. **Sequential Application**: Approved candidates must be applied using standard public MCP tools (`kb_upsert`) sequentially. After application, the agent must run `kb_check` to verify KB integrity.
6. **No Pre-requisite Structure**: Bootstrap must not require existing `.kb/config.json`, `documentation/**`, or `symbols.yaml` to be present or structured to provide a useful onboarding experience.
7. **MCP-Only Guidance**: All agent-facing bootstrap instructions must use MCP tools and sanctioned slash commands. Guidance must never suggest direct `kibi` CLI commands for maintenance.
