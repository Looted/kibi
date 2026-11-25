---
title: A governing requirement named from a card that covers less than half the question is refused
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T20:05:52.102Z'
id: SCEN-NEG-search-weak-answer-UNDER-COVERED
type: scenario
---
Given a question whose nearest card covers a third of its weight, when kb_search names that card's requirement as governing, then it is refused: a requirement governs only from a card covering at least 0.5 of the question.