---
id: TEST-scripts-unit-coverage-runner
title: Verify unit coverage runner orchestration
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-08-12T00:00:00Z
links:
  - type: validates
    target: REQ-014
  - type: validates
    target: SCEN-009
---

Run the unit coverage orchestration fixture and assert that the test command, coverage collection, and summary handoff complete in order. When package shards report the same source file, the runner emits one LCOV record with the line-coverage union instead of concatenating duplicate records.
