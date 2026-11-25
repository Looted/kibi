---
title: A weak answer that says nothing governs the question is refused
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:25:01.447Z'
id: SCEN-NEG-search-weak-answer-NOTHING-GOVERNS
type: scenario
---
Given a question most of whose words no decision holds, when kb_search answers that nothing governs it or names a nearest card as governing, then it is refused: the answer lists the uncovered words and names no governing requirement.