---
title: A skill loaded through the CLI or MCP marks the workspace like a hook-seen load
status: open
priority: should
semantic_text: A Kibi skill loaded through the CLI or the MCP server shall mark the workspace for skill_loaded_before the same way a skill load seen by a host hook does.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 02462ffaf722acccfb573bcc75e220a9b1134f715250e9512957355cb3e611dd
semantic_inventory:
  - claim_key: CLAIM-CFA8BB80BC91B4C8
    claim_text: A Kibi skill loaded through the CLI or the MCP server shall mark the workspace for skill_loaded_before the same way a skill load seen by a host hook does
    role: normative
    status: modeled
    span:
      start: 0
      end: 153
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-CFA8BB80BC91B4C8
tags:
  - telemetry
  - privacy
  - agent-core
  - cli
  - mcp
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
  approved_by: maintainer
id: REQ-kibi-telemetry-skill-load-routes
type: req
---
A Kibi skill loaded through the CLI or the MCP server shall mark the workspace for skill_loaded_before the same way a skill load seen by a host hook does.

## Context

`skill_loaded_before` on an operation event says whether a Kibi skill was loaded in that workspace shortly before, so maintainers can compare how agents that read a skill and agents that did not fare. Until this rule, only host hooks recorded a load, through `rememberTelemetrySkillLoad` in kibi-agent-core. Agents that load skills with `kibi skills load`, `kibi skills-load`, `kibi skill` with `action: "load"` or MCP `kb_skills`, and every session without Kibi host hooks, never set the marker. In fourteen days of usage data the field was never true. The marker is the workspace path's one-way hash kept next to the local telemetry queue, as REQ-kibi-telemetry-session-signals requires; only a successful load sets it.

## Source

> Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"