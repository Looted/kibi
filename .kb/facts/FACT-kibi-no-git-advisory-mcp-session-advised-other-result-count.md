---
title: An MCP server session in a workspace outside any Git repository must attach the no_git_repository advisory to at most one result of an operation other than status and check for each store
status: active
fact_kind: property_value
subject_key: kibi.no_git_advisory.mcp_session
property_key: advised_other_result_count
operator: lte
value_type: int
value_int: 1
claim_key: CLAIM-54B168E21FC16457
claim_text: An MCP server session in a workspace outside any Git repository must attach the no_git_repository advisory to at most one result of an operation other than status and check for each store
text_ref: REQ-kibi-no-git-advisory-once-per-mcp-session
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:20:38.058Z'
id: FACT-kibi-no-git-advisory-mcp-session-advised-other-result-count
type: fact
---
