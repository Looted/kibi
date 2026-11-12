---
title: 'The impact check lists REQ-001 and the covering test for the changed hello symbol'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-impact-next-actions
type: scenario
---
Given a synced fixture where SYM-HELLO-001 implements REQ-001 and is covered by TEST-HELLO-001, when kibi check --input runs with sourceFiles src/sample.js and impact diagnostics on, then linkedEntities lists REQ-001 through implements and TEST-HELLO-001, both from SYM-HELLO-001.

This is the success side of the impact check report. documentation/tests/e2e/packed/traceability-gate.test.ts, in its impact report case, exercises it.
