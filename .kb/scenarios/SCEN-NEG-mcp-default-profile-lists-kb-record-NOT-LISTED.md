---
title: A default profile without kb_record is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:20.550Z'
id: SCEN-NEG-mcp-default-profile-lists-kb-record-NOT-LISTED
type: scenario
---
Given an MCP server whose default tool profile does not list kb_record, when its tool list is checked, then it is refused: the default profile must list kb_record.
