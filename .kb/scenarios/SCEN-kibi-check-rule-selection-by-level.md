---
title: A plain kibi check runs the knowledge rules at every Kibi level and the verification rules only at test
status: active
expects: success
tags:
  - check
  - rules
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:44:47.710Z'
id: SCEN-kibi-check-rule-selection-by-level
type: scenario
---
Given a project at Kibi level test, when a plain kibi check runs, then it runs every canonical and advisory rule of both layers; given the same project at level remember, then it runs the canonical and advisory rules of the knowledge layer and none of the verification layer. Both skip the migration rules, and an explicit rule selection runs the rules it names.
