---
title: 'An upsert into an authored lane writes the scenario file'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-kb-path-classes
type: scenario
---
Given an initialized workspace, when the packed CLI upserts a scenario with document.path .kb/scenarios/SCEN-DERIVED-TARGET.md, then it exits 0 and writes the file in the scenarios lane.

This is the success side of .kb path classes. documentation/tests/e2e/packed/init-sync-check.test.ts, in its derived tree refusal case, exercises it.
