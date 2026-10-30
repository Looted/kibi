---
title: A requirement failing the semantic gate is dropped only at that gate, never at a later one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:07:05.781Z'
id: SCEN-NEG-kibi-branded-health-report-later-gate-drop
type: scenario
---
Given a workspace whose only current requirement first fails the semantic gate, when `kibi report` renders the requirement-health report, then the rail refuses to place that drop at any later gate: the semantic gate shows the only drop and every later gate shows no drop.

This is the failure side of sequential proof gates: a requirement must be counted where it first falls short, or the rail misleads readers about what to fix first. documentation/tests/e2e/packed/cli-workflows.test.ts "should generate a self-contained HTML requirement health report" exercises it.
