---
title: A rule session's first source edit is not left without the template
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T08:45:54.984Z'
id: SCEN-NEG-claude-decision-capture-nudges-NO-TEMPLATE
type: scenario
---
Given a session whose prompt stated a rule and that has recorded nothing, when the agent first edits a source file, then the hook does not stay silent: it adds the kb_upsert template, so the rule is not left to the stop. packages/claude/tests/hook-runner.test.ts "the first source edit of a rule session gets the kb_upsert capture template once" exercises it.