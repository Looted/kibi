---
title: A remember session that lists the planning tools or leaves hidden ones unnamed is rejected
status: active
expects: rejection
tags:
  - levels
  - tool-surface
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-26T10:33:00.758Z'
id: SCEN-NEG-kibi-remember-level-tool-list
type: scenario
---
Given an MCP server at level remember whose full profile lists every tool but kb_ingest_proof, or whose instructions leave kb_find_gaps and kb_compile_intent unnamed, when its tool list is checked, then it is rejected.