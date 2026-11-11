---
title: 'A producer that reports a native case without a native_id cannot prove the test'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-playwright-native-id
type: scenario
---
Given a packed install and a custom producer that reports one native_case result with no native_id, when kibi prove runs the test, then it fails and names the result that has no native_id.

## Context

Run by the packed check-review-rules E2E test.
