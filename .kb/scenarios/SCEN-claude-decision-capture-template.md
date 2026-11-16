---
title: A rule session gets a kb_upsert template right after its first source edit
status: active
priority: must
expects: success
tags:
  - hooks
  - capture
origin:
  kind: agent
  recorded_at: '2026-11-16T08:45:53.096Z'
id: SCEN-claude-decision-capture-template
type: scenario
---
Given a session whose prompt said "Totals must never be negative.", when the agent first edits src/checkout.ts, then the PostToolUse hook gives it a kb_upsert payload to fill in for the rule, quoting "must". A later edit gets no second template, and a session without a rule, or one that already recorded something with kb_upsert, gets none. packages/claude/tests/hook-runner.test.ts "the first source edit of a rule session gets the kb_upsert capture template once" exercises it; the Codex, Cursor and ZCode hook runner tests check the same shared behavior.