---
title: A replacement description longer than 1024 characters is refused at compose
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:56.819Z'
id: SCEN-CASE-skillopt-description-candidates-description-too-long
type: scenario
---
Given a body file and a single-line description file of 1025 characters, when the operator composes a SkillOpt candidate, then compose exits non-zero with description_too_long and freezes no manifest.

documentation/tests/e2e/skillopt-description-candidates.e2e.ts exercises this edge case in its second part, where unsafe or orphaned descriptions are refused. It covers the value past the bound, `replacement_description_max_characters gt 1024`.
