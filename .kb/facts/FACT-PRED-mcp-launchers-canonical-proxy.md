---
title: 'Predicate: conditional_behavior(host_mcp_launcher,any_launcher_build,embed_canonical_session_proxy_unchanged)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - host_mcp_launcher
  - any_launcher_build
  - embed_canonical_session_proxy_unchanged
canonical_key: conditional_behavior(host_mcp_launcher,any_launcher_build,embed_canonical_session_proxy_unchanged)
polarity: assert
claim_key: CLAIM-3C5DBEBD118CD69D
claim_text: Every host MCP launcher must embed the canonical Kibi session proxy without changes
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
id: FACT-PRED-mcp-launchers-canonical-proxy
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
