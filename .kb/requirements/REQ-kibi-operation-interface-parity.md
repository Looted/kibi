---
id: REQ-kibi-operation-interface-parity
title: Kibi public operation surface keeps MCP and CLI in parity
status: open
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-08-15T08:05:00.000Z
source: documentation/requirements/REQ-kibi-operation-interface-parity.md
priority: must
owner: platform-team
tags:
  - mcp
  - cli
  - parity
  - policy
links:
  - type: relates_to
    target: ADR-022
  - type: specified_by
    target: SCEN-kibi-operation-interface-parity
  - type: verified_by
    target: TEST-kibi-operation-interface-parity
type: req
---
The public operation surface stays aligned across MCP and the trusted project-local CLI. Both peers expose the same versioned operation catalog and structured contracts; hosts select the visible approved surface by capability rather than by a fixed preference.
