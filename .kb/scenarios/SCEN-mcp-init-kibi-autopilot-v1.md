---
id: SCEN-mcp-init-kibi-autopilot-v1
title: Historical bootstrap scenario (superseded)
status: superseded
created_at: 2026-04-19T00:00:00.000Z
updated_at: 2026-05-05T00:00:00.000Z
source: documentation/scenarios/SCEN-mcp-init-kibi-autopilot-v1.md
tags:
  - scenario
  - bootstrap
  - plan-apply
links:
  - type: relates_to
    target: REQ-mcp-init-kibi-autopilot-v1
type: scenario
---

**Scenario: Interactive Kibi bootstrap in an uninitialized repository**

**GIVEN** an OpenCode agent is working in a repository where Kibi is not yet initialized (`root_uninitialized` posture)
**AND** the OpenCode plugin has nudged the agent to use `/init-kibi`
**WHEN** the agent starts the interactive `/init-kibi` workflow
**THEN** the agent asks at most 4 bounded questions to gather declared context (summary, source of truth, priority root, config anchors)
**AND** captures the declared context from the user's responses
**WHEN** the agent invokes the `kb_autopilot_generate` MCP tool with the gathered context
**THEN** the MCP server synthesizes candidate entities and relationships grounded in both declared intent and discovered evidence
**AND** returns additive `structuredContent` including `promptBlock`, `recommendedActions`, `declaredContext`, `confidence`, `bootstrapMode`, `candidates`, and `discoverySummary`
**AND** the agent presents a preview of the proposed changes to the user for approval
**WHEN** the user approves the plan
**THEN** the agent uses `kb_upsert` to sequentially create the approved entities and relationships in the KB
**AND** finally runs `kb_check` to verify the integrity of the newly initialized knowledge base.
