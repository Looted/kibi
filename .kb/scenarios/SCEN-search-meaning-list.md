---
title: Decisions closest in meaning are listed beside the cards
status: active
priority: should
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:20.318Z'
id: SCEN-search-meaning-list
type: scenario
---
Given a provider that scores a decision's linked scenario, test or assumed fact close to the question, when kb_search answers, then the first page lists that decision beside the cards, ordered by the mean of its two best scores, and leaves out cards, folded, superseded and other-scope decisions.