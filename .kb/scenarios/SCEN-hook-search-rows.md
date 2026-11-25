---
title: A search shows rows only for a few requirements its matches fall in
status: active
expects: success
priority: must
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  recorded_at: '2026-11-25T14:27:59.705Z'
id: SCEN-hook-search-rows
type: scenario
---
Given a search whose matches fall inside symbols that implement at most 6 requirements, when the hook runs, then it shows rows for the 3 with the most matching lines.
