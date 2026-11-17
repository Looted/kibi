---
title: A skill that teaches dry run, write and read-back as the default is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T16:00:00.000Z'
tags:
  - skills
  - negative-path
id: SCEN-NEG-kibi-skills-write-without-ritual-THREE-CALLS
type: scenario
---
Given a skill that tells the agent to validate every payload with dryRun, send it, and then exact-read the result back, the core-arc test rejects it: that is three calls where one write already reports its result.

packages/cli/tests/skills-core-arc.test.ts asserts it on the bundled skill bodies.