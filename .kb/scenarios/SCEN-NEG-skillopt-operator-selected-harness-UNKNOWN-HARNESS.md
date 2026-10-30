---
title: An unknown SkillOpt harness selection is refused before any cell work
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:17.785Z'
id: SCEN-NEG-skillopt-operator-selected-harness-UNKNOWN-HARNESS
type: scenario
---
Given KIBI_SKILLOPT_HOST set to an unknown value, when the operator runs campaign.ts evaluate for a skill, then the command exits 2 before any paid preparation or cell work.

This is the failure side of harness selection: an unrecognised harness must be refused rather than silently replaced by another one. documentation/tests/e2e/skillopt-claude-code-host.e2e.ts, in its fourth part where an unknown host fails before paid preparation, exercises it.
