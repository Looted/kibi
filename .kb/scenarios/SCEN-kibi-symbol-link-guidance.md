---
title: A coarse symbol link is refused when written, and coverage and validation errors name the missing step
status: active
expects: success
tags:
  - symbol
  - traceability
  - upsert
  - coverage
origin:
  kind: agent
  recorded_at: '2026-10-15T15:56:20.014Z'
id: SCEN-kibi-symbol-link-guidance
type: scenario
---
Given a stored class-level symbol whose public methods are behavioral symbols, when the agent upserts only `implements` and `covered_by` links on it, then `kb_upsert` refuses the write with the granular candidates, and validating the same payload without writing returns an error envelope. When the links move to a method symbol whose test does not verify the requirement's scenario, then `symbol-coverage` names the test, the requirement and `verified_by(SCEN-…, TEST-…)` instead of asking for `covered_by`. An invalid test status lists only the test status values.

This exists because coarse links reached the KB unwarned and were only rejected by the pre-commit hook.