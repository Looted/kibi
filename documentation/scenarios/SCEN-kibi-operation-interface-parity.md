---
id: SCEN-kibi-operation-interface-parity
title: Kibi public operations stay aligned across MCP and CLI
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/scenarios/SCEN-kibi-operation-interface-parity.md
priority: must
tags:
  - mcp
  - cli
  - parity
  - policy
links:
  - type: relates_to
    target: REQ-kibi-operation-interface-parity
  - type: relates_to
    target: ADR-022
---

## Scenario

A reviewer is checking the public Kibi operation surface.

### Steps

1. The reviewer compares the MCP and CLI public operation lists.
2. The reviewer counts the operations and checks that the published surface stays at 18 peer operations.
3. The reviewer reads the docs and sees both surfaces described as peers.

### Expected Outcomes

- The public operation set matches across MCP and CLI.
- The count remains 18.
- Neither surface is described as the only public route.
