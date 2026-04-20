---
id: SCEN-mcp-init-kibi-autopilot-v1
title: "Agent uses kb_autopilot_generate to bootstrap a repository"
status: draft
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
source: documentation/scenarios/SCEN-mcp-init-kibi-autopilot-v1.md
tags:
  - scenario
  - autopilot
  - init-kibi
links:
  - type: relates_to
    target: REQ-mcp-init-kibi-autopilot-v1
---

**Scenario: Initializing Kibi in an uninitialized repository**

**GIVEN** an OpenCode agent is working in a repository where Kibi is not yet initialized (`root_uninitialized` posture)
**AND** the OpenCode plugin has nudged the agent to use `/init-kibi`
**WHEN** the agent invokes the `kb_autopilot_generate` MCP tool
**THEN** the MCP server analyzes the existing documentation and code structure
**AND** returns a structured list of candidate `req`, `scenario`, and `test` entities derived from the source files
**AND** includes a proposed `plan` for linking these entities
**AND** the agent reviews the candidates for accuracy and alignment with project goals
**WHEN** the agent is satisfied with the plan
**THEN** the agent uses `kb_upsert` to batch-create the approved entities and relationships in the KB
**AND** finally runs `kb_check` to verify the integrity of the newly initialized knowledge base.
