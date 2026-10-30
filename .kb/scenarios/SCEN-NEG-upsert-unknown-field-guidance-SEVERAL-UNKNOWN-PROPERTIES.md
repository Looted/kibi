---
title: An upsert with several unknown properties is rejected naming every one of them
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:11:04.753Z'
id: SCEN-NEG-upsert-unknown-field-guidance-SEVERAL-UNKNOWN-PROPERTIES
type: scenario
---
Given a requirement upsert whose properties include description and colour, which the schema does not define, when it is validated, then it is rejected with an error that names both properties and points prose at document.body.

This is the failure side of unknown field guidance: the writer learns every field to fix from one rejection instead of one at a time. packages/cli/tests/operations/upsert-unknown-property-guidance.test.ts "lists every unknown property, not only the first" exercises it.
