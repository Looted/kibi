---
title: 'A staged, never-synced requirement is evaluated by the staged check'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-staged-overlay-kb
type: scenario
---
Given a synced workspace and a new must-priority requirement that is staged but never synced, when the packed CLI runs kibi check --staged, then its output reports that requirement.

This is the success side of the staged overlay. documentation/tests/e2e/packed/traceability-gate.test.ts, in its comment-only edit and overlay case, exercises it.
