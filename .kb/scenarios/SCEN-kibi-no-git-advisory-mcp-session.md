---
title: An agent calls MCP tools outside Git
status: active
expects: success
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:20:45.038Z'
id: SCEN-kibi-no-git-advisory-mcp-session
type: scenario
---
Given an MCP server in a directory outside any Git repository, when an agent calls kb_search, kb_upsert, kb_search, kb_status and kb_check, then the first kb_search result carries the no_git_repository advisory, kb_upsert and the second kb_search do not, and kb_status and kb_check do.
