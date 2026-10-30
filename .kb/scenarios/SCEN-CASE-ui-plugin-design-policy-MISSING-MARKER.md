---
title: A component rewrite that drops a pattern marker is reported by the marker rule
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:12:06.299Z'
id: SCEN-CASE-ui-plugin-design-policy-MISSING-MARKER
type: scenario
---
Given an Angular component that implements a line_dots_timeline requirement and whose html template keeps timeline_connector but drops timeline_dot, when the check policies run, then the pattern marker rule reports one finding for the symbol naming the requirement, the pattern, the missing marker and both searched files.

This covers the value past the bound, `gt 0`, of the claim that implementing files contain every pattern marker. packages/cli/tests/public/check-policy-rules.test.ts "a rewrite that drops a pattern marker is reported per marker" exercises it.
