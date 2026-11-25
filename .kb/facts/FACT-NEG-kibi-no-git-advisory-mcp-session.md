---
title: Every MCP result outside Git repeats the no-Git advisory
status: active
fact_kind: property_value
subject_key: kibi.no_git_advisory.mcp_session
property_key: advised_other_result_count
operator: eq
value_type: int
value_int: 3
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:20:42.668Z'
id: FACT-NEG-kibi-no-git-advisory-mcp-session
type: fact
---
An MCP server session outside any Git repository attaches the no_git_repository advisory to every tool result (three results, three advisories), spending agent context on a message that cannot change within the session. The failure-side scenario of REQ-kibi-no-git-advisory-once-per-mcp-session assumes this state and expects Kibi to reject it.
