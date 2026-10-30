---
title: A requirement whose implementing symbol cannot be located keeps the missing coordinates gap
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:47:20.967Z'
id: SCEN-CASE-kibi-conservative-requirement-proof-SYMBOL-NO-COORDINATES
type: scenario
---
Given a requirement implemented by one Python method symbol whose exact coordinates the extractor cannot resolve, when sync refreshes symbol coordinates and coverage runs, then the refresh reports the symbol as failed, the requirement carries the missing_symbol_coordinates gap and the repair plan routes it to a reviewed source_coordinates batch; the gap clears only once the symbol is anchored explicitly.

The test case "routes Python coordinate misses to authored repair and recovers after explicit coarse anchoring" in documentation/tests/e2e/packed/dependency-ordered-repair-plan.test.ts exercises it through the packed CLI. It covers the value past the bound, `gt 0`, of proof-bearing symbols without exact current coordinates.