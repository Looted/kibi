---
title: A governing requirement reaches the answer without its statement
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T15:41:56.321Z'
id: SCEN-NEG-search-answer-governing-statement-MISSING
type: scenario
---
A requirement with a semantic_text is listed as governing, but its entry carries only its id and title, so the agent reads the rule's neighbours and not the rule.

This is the failure side the change must not produce; the tests of TEST-search-answer-first-layer check it.