---
title: A requirement without a reason is written without a word
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T14:58:11.271Z'
id: SCEN-NEG-upsert-notes-missing-reason-UNNOTED
type: scenario
---
An agent records a new rule without its rationale, or changes the value a rule is grounded on, and the result says nothing, so the reason the person gave in the conversation is lost.

This is the failure side the write must not produce; packages/cli/tests/consumer/upsert-reason-note.test.ts checks it.