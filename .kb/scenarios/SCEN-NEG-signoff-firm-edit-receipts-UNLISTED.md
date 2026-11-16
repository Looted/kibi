---
title: A receipt the summary leaves out fails the signoff tests
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T07:00:12.816Z'
id: SCEN-NEG-signoff-firm-edit-receipts-UNLISTED
type: scenario
---
Given a change that adds a firm-edit receipt for a requirement the change does not otherwise touch, when kibi signoff collects the change, then a summary that leaves that receipt out fails packages/cli/tests/signoff/collect-mutation.test.ts.