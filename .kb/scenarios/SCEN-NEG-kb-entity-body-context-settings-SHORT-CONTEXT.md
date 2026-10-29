---
title: A context section of eleven words is too short to count as body context
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:11:11.370Z'
id: SCEN-NEG-kb-entity-body-context-settings-SHORT-CONTEXT
type: scenario
---
Given a scenario body of twelve distinct words and the same body with one word removed, when the body context is assessed, then the twelve-word body counts as context and the eleven-word body is refused with the reason too_short, and a body that is only a heading is refused with the reason none.

This is the failure side of the minimum context length: prose under twelve words must not count as stated context. packages/cli/tests/entity-body-context.test.ts "twelve words is enough, eleven is too short, none is none" exercises it.
