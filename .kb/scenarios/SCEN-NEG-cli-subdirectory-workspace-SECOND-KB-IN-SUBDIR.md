---
title: A kibi command typed in a subdirectory does not compile a second knowledge base there
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:07.580Z'
id: SCEN-NEG-cli-subdirectory-workspace-SECOND-KB-IN-SUBDIR
type: scenario
---
Given a synced Kibi workspace and a subdirectory apps/server without its own .kb/manifest.json, when kibi query runs from that subdirectory, then it does not create a second, empty knowledge base in apps/server: it answers from the workspace's KB and lists the workspace requirement.

This is the failure side of subdirectory resolution: a nested invocation that silently starts an empty KB would read as no knowledge at all. documentation/tests/e2e/packed/cli-subdirectory-workspace.test.ts "answers from the workspace knowledge base" exercises it.
