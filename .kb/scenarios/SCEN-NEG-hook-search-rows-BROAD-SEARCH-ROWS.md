---
title: A search shows rows only for a few requirements its matches fall in (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:28:00.590Z'
id: SCEN-NEG-hook-search-rows-BROAD-SEARCH-ROWS
type: scenario
---
Given a search whose matches qualify more than 6 requirements, or a Glob, when the hook shows rows for it, then it is refused.
