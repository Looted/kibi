---
title: Confirming a run on another harness with Codex evaluation evidence is refused before any work
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:14.340Z'
id: SCEN-NEG-skillopt-host-neutral-optimization-CROSS-HARNESS-CONFIRM
type: scenario
---
Given a completed Codex evaluation, when the operator runs campaign.ts confirm with --host claude-code, or with KIBI_SKILLOPT_HOST set to claude-code, then the command exits 1 with evaluation_host_mismatch and writes no artifacts.

This is the failure side of host-neutral optimisation: evidence from one harness never confirms or packages a run on another. documentation/tests/e2e/skillopt-host-neutral-optimization.e2e.ts, in its third part where confirm refuses evidence from another harness, exercises it.
