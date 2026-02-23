---
id: SCEN-011
title: Agent retrieves full ADR decision history before making an architectural change
status: active
created_at: 2026-02-20T10:35:09Z
updated_at: 2026-02-20T10:35:09Z
source: brief.md
priority: must
tags:
  - adr
  - temporal
  - agent-workflow
links:
  - type: specified_by
    target: REQ-016
---

## Scenario

An AI agent is considering a change to the storage layer and needs to understand the full history of architectural decisions before proposing changes.

### Steps

1. Agent is considering a change to the storage layer.
2. Agent calls kbderive with rule: current_adr — receives list of active ADRs.
3. Agent calls kbderive with rule: adr_chain, params: {adr: "ADR-001"} — receives full timeline.
4. Agent understands ADR-001 was superseded by ADR-009 in v0.5 and uses that context.
5. Agent creates ADR-010 with links: [{type: supersedes, target: ADR-009}].
6. kibi sync ingests ADR-010. kibi check passes. ADR-009 is no longer returned by current_adr.

### Expected Outcomes

- Agent has complete context of decision evolution
- Agent understands which ADRs are currently in effect
- Proposed changes respect existing architectural decisions
- Supersession chain remains consistent and machine-readable
