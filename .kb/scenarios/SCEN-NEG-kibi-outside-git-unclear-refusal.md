---
title: Kibi refuses a workspace outside Git instead of failing as an unexplained error
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T07:11:55.634Z'
id: SCEN-NEG-kibi-outside-git-unclear-refusal
type: scenario
---
Given a directory outside any Git repository and no KIBI_BRANCH, where an operation would answer as an unexplained OPERATION_FAILED (marked retryable, or with no error category) or kibi init would write part of .kb/ before failing, when kibi init, kibi status, a CLI JSON route or an MCP tool runs, then Kibi rejects the workspace: each refuses with NOT_A_GIT_REPOSITORY, retryable false and the instruction to run git init, and the directory stays empty.

This is the failure side of the outside-Git refusal. packages/cli/tests/consumer/outside-git.test.ts "init writes nothing and every route gives the same coded instruction" and packages/mcp/tests/server/session-coverage.test.ts "refuses a workspace outside Git with a coded instruction" exercise it.
