---
title: kibi usage-remediation lists missing coverage evidence as a report-level repair
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T07:20:00.000Z'
id: SCEN-NEG-kibi-telemetry-remediation-evidence-COVERAGE-GAP-DROPPED
type: scenario
---
Given a packed CLI workspace whose usage log holds 20 recent diagnostic kb_status events and no complete requirement coverage event, when `kibi usage-remediation --format json` runs, then the report is action_required and lists a proof_gap_recovery item with scope report, target coverage:req, no event, and a reason and repair action.

This is the failure side of the missing-coverage rule: a report that showed no event for the gap would read as nothing to repair. documentation/tests/e2e/packed/telemetry-remediation-evidence.test.ts "keeps missing complete coverage evidence as a report-level repair" exercises it.
