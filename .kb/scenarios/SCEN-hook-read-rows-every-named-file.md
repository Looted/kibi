---
title: A shell read gets rows from every file it names, focused by its line ranges
status: active
expects: success
priority: must
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  recorded_at: '2026-11-25T14:27:41.868Z'
id: SCEN-hook-read-rows-every-named-file
type: scenario
---
Given a shell command that reads two linked files, one of them through sed -n with a line range, when the hook runs, then one block holds rows from both files and the ranged file's rows name only the symbols in that range.
