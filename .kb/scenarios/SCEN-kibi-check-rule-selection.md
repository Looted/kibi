---
title: 'A plain check skips migration rules and passes with only an advisory finding'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-check-rule-selection
type: scenario
---
Given a packed workspace whose only finding is a proposed ADR, when kibi check runs with no rule selection, then the evaluated rules include entity-context-missing and adr-proposed but not strict-readiness or semantic-completeness, selecting strict-readiness by name runs only that rule, and the check exits 0 with rule.adr-proposed as a non-blocking quality diagnostic and no violations.

This is the success side of check rule selection. documentation/tests/e2e/packed/init-sync-check.test.ts, in its rule selection case, exercises it.
