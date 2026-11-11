---
title: Every host adapter routes bootstrap to the shared planner and canonical skills
status: open
semantic_text: MCP, Cursor, OpenCode, Codex, and CLI adapters must route to the shared planner and canonical skills rather than duplicate workflows.
semantic_clauses:
  - MCP, Cursor, OpenCode, Codex, and CLI adapters must route to the shared planner and canonical skills rather than duplicate workflows.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9c2a275e0eec09a7796a2385a81327a815661f37fa97febd1cd6d25238294eb0
semantic_inventory:
  - claim_key: CLAIM-D08D0673739675FB
    claim_text: MCP, Cursor, OpenCode, Codex, and CLI adapters must route to the shared planner and canonical skills rather than duplicate workflows
    role: normative
    status: modeled
    span:
      start: 0
      end: 132
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-D08D0673739675FB
firmness: firm
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T04:31:17.510Z'
id: REQ-kibi-bootstrap-shared-planner-routing
type: req
---
MCP, Cursor, OpenCode, Codex, and CLI adapters must route to the shared planner and canonical skills rather than duplicate workflows.

## Context

Bootstrap behaves the same in every host, because no adapter keeps its own copy of the workflow.



## Why this changed

Split from REQ-KIBI-BOOTSTRAP-PLAN, which held four behaviors: initialization, seeding and handoff; the read-only hash-bound planner; approved sequential apply with a repair journal; and adapters that share the planner. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
