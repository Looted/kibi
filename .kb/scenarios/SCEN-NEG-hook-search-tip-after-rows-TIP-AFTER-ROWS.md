---
title: The one-time search tip is skipped when the first search already gets rows (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:30:27.205Z'
id: SCEN-NEG-hook-search-tip-after-rows-TIP-AFTER-ROWS
type: scenario
---
Given a first search that got requirement rows, when the hook also adds the search tip, then it is refused.
