---
title: A whole-file read of a busy file names its requirement ids on one line (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:29:17.882Z'
id: SCEN-NEG-hook-busy-file-ids-SILENT-BUSY-FILE
type: scenario
---
Given a busy file read whole, when the hook names none of its requirement ids, then it is refused.
