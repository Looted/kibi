---
title: A kibi-usage body that keeps every topic inline is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T16:00:00.000Z'
tags:
  - skills
  - negative-path
id: SCEN-NEG-kibi-usage-core-arc-OVERSIZED-BODY
type: scenario
---
Given a kibi-usage body of 55,000 characters that keeps every topic section inline, the core-arc test rejects it: the body must stay under 4,500 characters with its topic guidance in resources.

packages/cli/tests/skills-core-arc.test.ts asserts it on the bundled skill.