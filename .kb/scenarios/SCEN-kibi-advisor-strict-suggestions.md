---
title: 'An expiry sentence gets a strict property suggestion with its value'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-advisor-strict-suggestions
type: scenario
---
Given the sentence "Session tokens expire after 30 days.", when the packed CLI runs kibi semantic-advisor on it, then the receipt suggests a strict_property fact with property expiry_days and value 30.

This is the success side of strict suggestions. documentation/tests/e2e/packed/cli-strict-modeling-surface.test.ts, in its semantic advisor case, exercises it.
