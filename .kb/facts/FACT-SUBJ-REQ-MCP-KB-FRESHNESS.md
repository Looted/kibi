---
title: MCP auto-refreshes KB attachment on same-branch external replacement
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: mcp.branch_attachment
canonical_key: req.req_mcp_kb_freshness
id: FACT-SUBJ-REQ-MCP-KB-FRESHNESS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Which branch KB the MCP server is attached to and how it notices that the store on the same branch was replaced externally, refreshing before serving queries or mutations, based on filesystem metadata. It does not change branch-switch handling.
