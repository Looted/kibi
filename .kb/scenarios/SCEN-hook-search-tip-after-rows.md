---
title: The one-time search tip is skipped when the first search already gets rows
status: active
expects: success
priority: must
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  recorded_at: '2026-11-25T14:30:26.243Z'
id: SCEN-hook-search-tip-after-rows
type: scenario
---
Given a session's first search whose matches fall in linked symbols, when the hook shows rows for it, then it adds no search tip.
