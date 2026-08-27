---
id: SCEN-mcp-kibi-briefing-v1
title: "Agent requests a start-task briefing from kb_briefing_generate"
status: closed
created_at: 2026-04-20T00:00:00Z
updated_at: 2026-04-24T09:15:00Z
source: documentation/scenarios/SCEN-mcp-kibi-briefing-v1.md
tags:
  - scenario
  - mcp
  - briefing
  - start-task
links:
  - type: relates_to
    target: REQ-mcp-kibi-briefing-v1
---

**Scenario: Ready start-task briefing**

**GIVEN** an OpenCode agent has start-task context through `taskText`, `sourceFiles`, or `seedIds`
**AND** the Kibi workspace posture and freshness are authoritative enough for cited output
**WHEN** the agent invokes `kb_briefing_generate`
**THEN** the MCP server returns a deterministic, citation-backed briefing artifact
**AND** the result contains only supported V1 content derived from cited Kibi entities
**AND** the result remains read-only and does not trigger KB mutation or background repair.

**Scenario: Unsupported or stale state fails closed**

**GIVEN** the agent invokes `kb_briefing_generate`
**AND** the workspace posture is unsupported, the KB is stale or dirty, or the evidence is too weak
**WHEN** the MCP server evaluates the request
**THEN** it must return `briefingState: "no_briefing"`
**AND** omit speculative summary, constraints, and regression-risk output
**AND** preserve activation and freshness metadata so the caller can explain why no briefing was produced.
