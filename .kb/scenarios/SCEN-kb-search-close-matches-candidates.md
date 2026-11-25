---
title: kb_search calls the requirements of a close ranking candidates
status: active
expects: success
priority: must
tags:
  - kb_search
  - search-answer
origin:
  kind: agent
  recorded_at: '2026-11-24T20:02:29.806Z'
id: SCEN-kb-search-close-matches-candidates
type: scenario
---
Given a kb_search whose top matches are close, when it answers, then its digest names the reached requirements as candidate requirements not confirmed to govern, and answer.note asks the agent to keep only those about the code being changed.
