---
title: A preflight from another actor does not count for an upsert and the upsert is listed for repair
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:48.492Z'
id: SCEN-NEG-kibi-telemetry-remediation-evidence-CROSS-ACTOR-PREFLIGHT
type: scenario
---
Given a usage log in which a requirement upsert is preceded by a successful kb_validate_upsert of the same payload under a different actor identifier and by a semantic advisor call under a different session identifier, when kibi usage-remediation runs, then the report is action_required and lists the upsert under validation_before_upsert and advisor_before_requirement_write with its exact log line, request id, session and actor.

This is the failure side of correlation boundaries: evidence from another session or actor must not satisfy a write. documentation/tests/e2e/packed/telemetry-remediation-evidence.test.ts "logs equivalent CLI/MCP correlation and emits deterministic exact repairs" exercises it.
