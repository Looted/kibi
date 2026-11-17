---
title: Skills teach a write as one kb_upsert call
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T16:00:00.000Z'
tags:
  - skills
id: SCEN-kibi-skills-write-without-ritual
type: scenario
---
Given the bundled Kibi skills, when an agent records behaviour by following them, then each write is one kb_upsert call whose result it reads for warnings and nextActions, with a dry run offered only as an optional preview and no exact read-back step.

packages/cli/tests/skills-core-arc.test.ts asserts it on every bundled skill except kibi-bootstrap, whose plan apply is checked separately.