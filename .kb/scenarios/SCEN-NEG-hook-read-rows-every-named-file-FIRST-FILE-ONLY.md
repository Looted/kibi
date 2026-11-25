---
title: A shell read gets rows from every file it names, focused by its line ranges (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:27:42.746Z'
id: SCEN-NEG-hook-read-rows-every-named-file-FIRST-FILE-ONLY
type: scenario
---
Given a shell command that names two linked files, when only the first file gets rows, then it is refused.
