---
title: Every host builds read and search rows with the shared composer (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:29:35.052Z'
id: SCEN-NEG-hook-read-rows-every-harness-HOST-OWN-ROWS
type: scenario
---
Given a supported host, when its read of linked code shows no shared rows, then it is refused.
