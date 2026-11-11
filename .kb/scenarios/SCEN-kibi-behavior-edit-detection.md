---
title: 'A behavior edit without evidence is blocked while a comment-only edit passes'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-behavior-edit-detection
type: scenario
---
Given a synced fixture, when a staged edit adds functions to src/sample.js without requirement, test or manifest changes, then kibi check --staged exits 1 with kibi_impact_evidence_missing naming src/sample.js; and when the staged edit only adds a comment, the staged check exits 0 without that diagnostic.

This is the success side of behavior-edit detection. documentation/tests/e2e/packed/traceability-gate.test.ts, in its behavior edit and comment-only cases, exercises it.
