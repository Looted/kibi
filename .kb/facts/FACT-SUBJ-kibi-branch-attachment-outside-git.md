---
title: Kibi branch attachment outside a Git repository
status: active
fact_kind: subject
subject_key: kibi.branch_attachment.outside_git
tags:
  - cli
  - mcp
  - branching
  - errors
origin:
  kind: agent
  recorded_at: '2026-11-25T07:05:41.456Z'
id: FACT-SUBJ-kibi-branch-attachment-outside-git
type: fact
---
What Kibi does when the workspace it runs in is not inside any Git repository and KIBI_BRANCH is not set, so there is no branch to attach the knowledge base to: the answer kibi init, kibi status, the CLI JSON routes and the MCP tools give, and what kibi init writes there.
