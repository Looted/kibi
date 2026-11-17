---
title: Guidance that forbids opening any .kb file while asking to stage it is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T16:00:00.000Z'
tags:
  - skills
  - negative-path
id: SCEN-NEG-kibi-commit-review-kb-staging-NEVER-OPEN
type: scenario
---
Given commit review guidance that says never to open any file under .kb while the same skill asks the agent to git add .kb, the core-arc test rejects it because the two instructions contradict each other.

packages/cli/tests/skills-core-arc.test.ts asserts it on the bundled skill.