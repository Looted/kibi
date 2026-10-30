---
title: A second stop in the same session does not ask again to record the decision
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:53.939Z'
id: SCEN-CASE-claude-decision-capture-nudges-ASKED-TWICE
type: scenario
---
Given a session that changed a source file, recorded nothing in the knowledge base and was already asked once at stop to record the decision the person stated, when the session stops again, then the Stop hook stays silent, so the decision is never asked for twice in one session.

The test case "a session that changed source and recorded nothing is asked once at stop to record the decision or say there was none" in packages/claude/tests/hook-runner.test.ts exercises it through the Claude Code hook runner: the second stop returns nothing. It covers the value past the bound, `gt 1`, of stop decision asks per session.