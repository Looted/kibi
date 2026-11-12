---
title: An old requirement that matches strongly leads to its replacement
status: active
priority: must
tags:
  - search
  - hooks
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:45.059Z'
id: SCEN-search-answer-replacement-strong-match
type: scenario
---
Given a requirement superseded by a current one, when a kb_search question matches the old requirement about as well as anything else, the answer proposes the replacement as governing via `supersedes <old id>` and lists the old requirement under notGoverning. When the old requirement matches far below the best candidate, the replacement is left out, so it does not fill a free governing slot in an answer about something else.