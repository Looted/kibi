---
title: An edit of code under a firm requirement is never let through silently
status: active
priority: must
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-04T18:45:00.000Z'
id: SCEN-NEG-agent-hosts-decision-guard-SILENT-FIRM-EDIT
type: scenario
---
Given a session whose agent is about to edit code that implements a current firm requirement
When the pre-edit hook runs
Then the edit does not pass silently: the hook tells the agent to ask the person first, once for that requirement in the session.

This is the failure side of the firm-edit notice. packages/zcode/tests/hook-runner.test.ts "an edit of code implementing a firm requirement tells the agent to ask first, once per requirement per session" exercises it.
