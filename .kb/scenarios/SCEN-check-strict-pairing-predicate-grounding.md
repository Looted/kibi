---
title: A requirement grounded by a predicate about its subject passes strict pairing
status: active
priority: must
tags:
  - check
  - modeling
  - predicates
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:03.367Z'
id: SCEN-check-strict-pairing-predicate-grounding
type: scenario
---
Given a requirement that `constrains` the subject fact `editor.autosave` and grounds its claim through `requires_property`, when the agent applies the three `replacementPlan` steps returned by `kb_model` mode `predicates` through the MCP server, the requirement `requires_predicate` a `commit_action` fact whose first argument is `editor.autosave`, and `kb_check` reports neither `proposition-complete`, `logic-coverage` nor `strict-req-fact-pairing` for it. A predicate whose first argument names another subject is still reported, and `strict-readiness` reports one level per requirement.

An onboarding evaluation found the pairing rule contradicting the replacement plan.