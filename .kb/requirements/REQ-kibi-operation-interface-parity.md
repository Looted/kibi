---
id: REQ-kibi-operation-interface-parity
title: Kibi public operation surface keeps MCP and CLI in parity
status: open
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-08-15T08:05:00Z
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
4. Remote SPARQL SELECT execution must use the shared operation executor through an explicit network port, preserve HTTP(S)-only endpoints and whole-second timeout behavior, and remain available through both MCP and the CLI JSON route.
5. Every CLI operation route must accept one JSON object through `--input <file|->` and use exit codes `0` for success, `1` for operation failure, and `2` for invocation or validation failure.
6. Material shared executors, transport protocol modules, runtime adapters, resolver scripts, and skill generators must have requirement-linked symbol traceability.
7. The MCP `kb_status` operation must report current workspace freshness: the PrologProcess query cache is invalidated before evaluation so a same-session status reflects writes made after a previous call instead of a stale cached result.
