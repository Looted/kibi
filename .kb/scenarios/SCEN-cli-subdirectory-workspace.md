---
title: A maintainer runs kibi from a subdirectory of the workspace
status: active
priority: should
tags:
  - cli
  - workspace
origin:
  kind: agent
  recorded_at: '2026-10-26T13:31:58.669Z'
id: SCEN-cli-subdirectory-workspace
type: scenario
---
Given a repository whose root holds the Kibi knowledge base and a requirement synced into it, when the maintainer types kibi query in a subdirectory such as apps/server with a relative --input file there, then Kibi answers from the root knowledge base, lists the requirement, reads the input file from the subdirectory, and creates no .kb directory in the subdirectory.