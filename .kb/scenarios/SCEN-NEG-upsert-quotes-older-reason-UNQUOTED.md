---
title: A grounded value changes under an old reason without a word
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T14:58:14.037Z'
id: SCEN-NEG-upsert-quotes-older-reason-UNQUOTED
type: scenario
---
A fact's value changes while the requirement grounded on it keeps a reason written for the old value, and the result does not show the reason, so it stays recorded as if it explained the new value.

This is the failure side the write must not produce; packages/cli/tests/consumer/upsert-reason-note.test.ts checks it.