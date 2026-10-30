---
title: A hook usage record without a host session identifier is kept out of the lookup before first edit metric
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:30.896Z'
id: SCEN-CASE-claude-hook-usage-telemetry-v2-SESSIONLESS-ROW
type: scenario
---
Given a usage log whose hook rows include one edit of a requirement-linked file that carries no session id, when kibi usage-metrics evaluates telemetry acceptance, then that row is skipped: it is not counted as an attempt or a lookup, and the metric is computed from the two sessions that carry an id.

This covers the edge case of one record without the host session identifier, the value past the bound `gt 0`: Kibi contains the broken record instead of attributing it to a session. packages/cli/tests/consumer/telemetry-lookup-before-first-edit.test.ts "reports the session that edited a requirement-linked file before kb_search or kb_query and credits the session that looked it up first" exercises it with its sessionless noise row and asserts a denominator of 2.
