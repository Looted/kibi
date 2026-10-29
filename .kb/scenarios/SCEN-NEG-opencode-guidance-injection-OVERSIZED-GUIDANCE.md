---
title: Oversized guidance is trimmed to a single block within the bullet and word budget
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:24:14.951Z'
id: SCEN-NEG-opencode-guidance-injection-OVERSIZED-GUIDANCE
type: scenario
---
Given the packed OpenCode prompt module and two file reminders of ninety words each for a risky source edit, when guidance is injected, then exactly one guidance block is added, the guidance before the completion reminder is trimmed to at most 120 words and 5 bullets, and only one of the oversized reminders survives.

This is the failure side of guidance injection: an oversized set of reminders must not flood the agent's prompt beyond the token budget. documentation/tests/e2e/packed/opencode-plugin.test.ts "trims oversized guidance to one block within the bullet and word budget" exercises it.
