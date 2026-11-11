---
title: 'A coarse service whose requirements share a tag is not reported as mixed purpose'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-symbol-granularity-quality
type: scenario
---
Given a packed workspace where WidgetService implements three requirements tagged ui, storage and billing that all also carry the widget tag, and WidgetService.render is a narrower symbol in the same file, when kibi check runs, then it reports no component_mixed_purpose_review.

This is the success side of the mixed-purpose diagnostic. documentation/tests/e2e/packed/init-sync-check.test.ts, in its mixed-purpose case, exercises it.
