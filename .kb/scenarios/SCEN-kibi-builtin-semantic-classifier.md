---
title: 'An expiry, a guard and a plain sentence get the strict_property, predicate and none lanes'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-builtin-semantic-classifier
type: scenario
---
Given the sentences "Session tokens must expire after 30 days.", "Paid launches must stay disabled until the budget is approved." and "The team likes coffee.", when the builtin semantic classifier classifies them twice, then the lanes are strict_property, predicate and none, and both runs return identical decisions.

This is the success side of builtin classification. documentation/tests/e2e/capability-plugins.e2e.ts, in its builtin providers section, exercises it.
