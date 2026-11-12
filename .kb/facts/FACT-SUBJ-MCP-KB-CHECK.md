---
title: MCP kb_check tool
status: active
tags:
  - strict-lane
  - mcp
  - check
fact_kind: subject
subject_key: mcp.kb_check
canonical_key: mcp.kb_check
id: FACT-SUBJ-MCP-KB-CHECK
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kb_check MCP tool, which runs Kibi's validation rules against the current branch KB, can be filtered to registered rules, and returns violations with descriptions and entity references, each impact diagnostic once. It is the MCP entry point, not the rules themselves.
