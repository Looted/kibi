---
title: A bare-SHA checkout answers reads from a read-only snapshot and refuses writes
status: active
priority: must
tags:
  - git
  - branching
  - detached-head
  - read-only
origin:
  kind: agent
  recorded_at: '2026-10-04T02:17:45.695Z'
id: SCEN-branch-detached-head-read-only
type: scenario
---
# A bare-SHA checkout answers reads from a read-only snapshot and refuses writes

Given a checkout of a commit with no local branch at HEAD
When an agent runs `kibi search`, `kb_query`, `kb_status`, `kb_check`, `kb_coverage` or `kb_graph`
Then Kibi compiles a read-only snapshot store from the checkout's tracked sources and answers from it
And every answer carries a `detached_head_read_only` warning naming the commit, the branches at HEAD, the store path and `writes: refused`.

Given the same checkout
When the agent runs `kb_upsert`, `kb_delete` or `kibi sync`
Then Kibi refuses and names `git switch <branch>`, `git switch -c <branch>` or `KIBI_BRANCH`, and no branch KB is written.

Given a detached HEAD with exactly one local branch at HEAD
When any operation runs
Then Kibi attaches that branch's KB exactly.
