---
title: kb_search calls the requirements of a close ranking candidates (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T20:02:31.098Z'
id: SCEN-NEG-kb-search-close-matches-candidates-GOVERNING
type: scenario
---
Given a kb_search whose top matches are close, when its digest labels the reached requirements governing, then it is refused.
