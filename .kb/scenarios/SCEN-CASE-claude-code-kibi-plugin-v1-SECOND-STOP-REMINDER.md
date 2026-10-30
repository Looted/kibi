---
title: An unchecked edited file is reminded about once at stop, not again
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:53:42.431Z'
id: SCEN-CASE-claude-code-kibi-plugin-v1-SECOND-STOP-REMINDER
type: scenario
---
Given a session that edited two source files without a later impact check and was reminded about them at the first stop, when the session stops again with no new edit, then the hook stays silent and the agent may stop, so each unchecked file is reminded about at most once until it is edited again.

The test case "unchecked source edits are reminded once, then the agent may stop" in packages/claude/tests/hook-runner.test.ts exercises it through the Claude Code hook runner. It covers the value past the bound, `gt 1`, of stop reminders per unchecked source file.