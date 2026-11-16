---
title: A long reason section crowds out the answer
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T10:21:02.775Z'
id: SCEN-NEG-search-answer-reason-length-TOO-LONG
type: scenario
---
A requirement whose Why section runs to several paragraphs is quoted whole, so the answer exceeds its budget and drops other governing requirements.

This is the failure side the answer must not produce; packages/cli/tests/search-answer.test.ts checks it.