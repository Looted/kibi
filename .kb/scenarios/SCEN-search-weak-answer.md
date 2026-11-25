---
title: A weak answer lists the uncovered words and names no governing requirement
status: active
priority: must
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:24.733Z'
id: SCEN-search-weak-answer
type: scenario
---
Given a question most of whose words no decision holds, when kb_search answers, then it returns the nearest cards, lists the words no card holds, names no governing requirement and says the missing match is not evidence that nothing governs the question.