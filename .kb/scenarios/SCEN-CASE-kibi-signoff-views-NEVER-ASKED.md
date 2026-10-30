---
title: A session that wrote a requirement is not allowed to stop without one signoff ask
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:51:26.345Z'
id: SCEN-CASE-kibi-signoff-views-NEVER-ASKED
type: scenario
---
Given a session that wrote a requirement with a real kb_upsert and has not run kibi signoff since, when the session stops, then the stop hook does not let it end silently: it asks for the signoff view and tells the agent to run kibi signoff, so the session is not left with zero asks.

The test case "a session that wrote a requirement is asked once at stop for a signoff view, unless kibi signoff ran since" in packages/claude/tests/hook-runner.test.ts exercises it through the Claude Code hook runner: the first stop returns the signoff request. It covers the value below the bound, `lt 1`, of signoff view asks per session.