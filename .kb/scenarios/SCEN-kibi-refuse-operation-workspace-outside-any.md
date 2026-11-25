---
title: An agent runs kibi init and kibi status in a directory that is not a Git repository
status: active
tags:
  - cli
  - init
  - branching
origin:
  kind: agent
  recorded_at: '2026-11-25T07:06:58.830Z'
id: SCEN-kibi-refuse-operation-workspace-outside-any
type: scenario
expects: success
---
Given a directory outside any Git repository and no KIBI_BRANCH, when an agent runs kibi init, then init exits 1, writes nothing, and tells it to run git init; when it runs kibi status as text, as a JSON route or through an MCP tool, then each refuses with NOT_A_GIT_REPOSITORY, retryable false and the same instruction. After git init, kibi init succeeds. With KIBI_BRANCH set, kibi init succeeds and says that every later command needs the same KIBI_BRANCH, and kibi status without it gives the same instruction.
