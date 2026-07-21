---
id: REQ-kibi-operation-interface-parity
title: Kibi public operation surface keeps MCP and CLI in parity
status: open
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
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
---

The Kibi public operation surface exposes exactly 18 peer operations across MCP and CLI.

1. The public operation surface must stay aligned across MCP and CLI.
2. The published operation set must contain exactly 18 peer operations.
3. Public documentation and traceability artifacts must describe the two surfaces as peers.
