---
title: Outside Git, MCP results do not all repeat the advisory
status: active
expects: rejection
tags:
  - negative-path
  - vcs
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:20:46.190Z'
id: SCEN-NEG-kibi-no-git-advisory-mcp-session
type: scenario
---
Given an MCP server outside any Git repository where every tool result would carry the advisory, when an agent calls several tools, then Kibi rejects that repetition: only the first result for the store and the status and check results carry it.
