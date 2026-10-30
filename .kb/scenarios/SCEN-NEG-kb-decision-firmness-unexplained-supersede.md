---
title: A supersede without a Why this changed section is blocked as supersedes-reason-missing
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:00:11.614Z'
id: SCEN-NEG-kb-decision-firmness-unexplained-supersede
type: scenario
---
Given a firm requirement and a new requirement that supersedes it without a Why this changed section and without firmness, when kb_check runs the decision firmness rules, then it reports supersedes-reason-missing and decision-firm-superseded for the new requirement until the write explains the change and makes it firm.

This is the failure side of decision firmness: replacing a firm decision silently, or without saying why, must not pass the check. packages/cli/tests/commands/decision-firmness.test.ts "kb_check blocks an unexplained supersede and a default decision replacing a firm one" exercises it through the public routes.
