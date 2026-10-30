---
title: An edit snippet for code whose lead requirement is superseded carries no must-keep-true or decision lines
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:26.322Z'
id: SCEN-NEG-agent-core-edit-snippets-RETIRED-LEAD
type: scenario
---
Given a source file whose lead requirement is superseded, when the agent edits that file, then the edit snippet marks the requirement as superseded and does not present its facts as something to keep true or its decision as binding.

This is the failure side of the grounding lines: a retired rule must not be presented as current. packages/claude/tests/hook-runner.test.ts "a superseded lead requirement is not presented as something to keep true" exercises it through the hook runner.
