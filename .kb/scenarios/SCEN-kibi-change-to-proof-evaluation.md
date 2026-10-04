---
id: SCEN-kibi-change-to-proof-evaluation
title: Compare change-to-proof outcomes across KB migrations
status: active
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: .kb/scenarios/SCEN-kibi-change-to-proof-evaluation.md
tags:
  - evaluation
  - search
  - planning
  - dogfood
links:
  - type: verified_by
    target: TEST-kibi-change-to-proof-evaluation
  - type: verified_by
    target: TEST-kibi-change-to-proof-evaluation-live
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

A dogfood project runs the same gold queries and intent cases before and after standardization, records command/version provenance, and compares useful-result rate, source hit rate, semantic completeness, contradiction safety, and proof-bearing test coverage.
