---
title: A second source edit in a rule session gets no second template
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-11-16T08:45:54.091Z'
id: SCEN-CASE-claude-decision-capture-nudges-TEMPLATE-TWICE
type: scenario
---
Given a rule session that was already given the capture template after its first source edit, when the agent edits source again, then the hook adds no second template. packages/claude/tests/hook-runner.test.ts "the first source edit of a rule session gets the kb_upsert capture template once" exercises it. It covers the value past the bound, `gt 1`, of capture templates per session.