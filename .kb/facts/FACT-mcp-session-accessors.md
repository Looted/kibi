---
title: MCP session state is encapsulated behind getter functions (getPrologProcess, getActiveBranchName, getAttachedBranchKbPath, getIsShuttingDown) instead of export-let bindings
status: active
fact_kind: meta
tags:
  - refactor
  - mcp-session
id: FACT-mcp-session-accessors
type: fact
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
The MCP session module exported mutable `let` bindings, so any module could change session state. Getters keep every mutation inside the module. Source: commit "encapsulate session state behind accessor functions".
