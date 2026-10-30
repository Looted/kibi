---
title: Confirm refuses evidence whose run recorded no harness
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:01.102Z'
id: SCEN-CASE-skillopt-host-neutral-optimization-UNRECORDED-HARNESS
type: scenario
---
Given a completed evaluation whose context names no host and whose run preflight receipt names no CLI version, when the operator runs campaign.ts confirm on it, then the command exits 1 with evaluation_host_unrecorded and writes no artifacts.

This covers the edge case of one run without its harness and CLI version records, the value past the bound `gt 0`: such evidence is refused rather than trusted for any harness. documentation/tests/e2e/skillopt-host-neutral-optimization.e2e.ts, in its part 4b where confirm refuses evidence without a recorded harness, exercises it.
