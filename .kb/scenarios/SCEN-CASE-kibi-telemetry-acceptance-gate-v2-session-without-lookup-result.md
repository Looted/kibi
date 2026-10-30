---
title: Every host session that edited requirement-linked code is counted by lookup_before_first_edit
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:52.905Z'
id: SCEN-CASE-kibi-telemetry-acceptance-gate-v2-session-without-lookup-result
type: scenario
---
Given a consumer usage log with one host session that ran kb_search before editing requirement-linked code and another that edited such a file first, plus sessionless and unlinked hook rows, when kibi usage-metrics evaluates telemetry acceptance, then lookup_before_first_edit counts both sessions (1 of 2), names the unguided file and fails the gate, so a session left without a result fails the check.

The test case packages/cli/tests/consumer/telemetry-lookup-before-first-edit.test.ts "reports the session that edited a requirement-linked file before kb_search or kb_query and credits the session that looked it up first" exercises it. It covers the value past the bound of host sessions without a result, `gt 0`.