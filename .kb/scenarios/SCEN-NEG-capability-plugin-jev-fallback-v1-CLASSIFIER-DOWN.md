---
title: A failing replace classifier falls back to builtin analysis without exposing credentials
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:19:05.130Z'
id: SCEN-NEG-capability-plugin-jev-fallback-v1-CLASSIFIER-DOWN
type: scenario
---
Given a replace-mode semantic classifier plugin whose classify call throws a network error, when the semantic advisor composes classification, then the result falls back to builtin analysis and the diagnostic names the model without including credentials.

This is the failure side of the optional classifier: an unavailable provider must not break or leak through classification. documentation/tests/e2e/capability-plugins.e2e.ts asserts "replace failure falls back to builtin" and "fallback diagnostics include the model and not credentials".
