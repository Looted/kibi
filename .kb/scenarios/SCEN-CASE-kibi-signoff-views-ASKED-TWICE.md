---
title: A second stop in the same session does not ask for the signoff view again
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:51:06.189Z'
id: SCEN-CASE-kibi-signoff-views-ASKED-TWICE
type: scenario
---
Given a session that wrote a requirement and was already asked once at stop for a signoff view, when the session stops a second time, then the stop hook stays silent, so the view is never asked for twice in one session.

The test case "a session that wrote a requirement is asked once at stop for a signoff view, unless kibi signoff ran since" in packages/claude/tests/hook-runner.test.ts exercises it through the Claude Code hook runner: the second stop returns nothing. It covers the value past the bound, `gt 1`, of signoff view asks per session.