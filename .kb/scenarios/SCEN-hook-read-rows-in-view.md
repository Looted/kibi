---
title: Read and search hooks show the requirements of the code in view
status: active
expects: success
priority: must
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  recorded_at: '2026-11-25T14:26:50.557Z'
id: SCEN-hook-read-rows-in-view
type: scenario
---
Given a source file whose symbols implement requirements, when the agent reads a line range or the whole file through a read, search or shell tool, then the hook shows one row per requirement of the symbols in view, the focused symbol's first.
