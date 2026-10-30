---
title: A source analysis v2 result that reports ok, partial or unsupported for oversized input is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:16.410Z'
id: SCEN-NEG-source-analysis-v2-OVERSIZED-OK-STATUS
type: scenario
---
Given an installed public SDK and a source input one UTF-16 code unit over the limit, when a result reporting ok, partial or unsupported, or a failed result carrying symbols or source ranges, is validated, then the SDK rejects it with an invalid capability result error; only a failed result with an input_limit diagnostic is accepted.

This is the failure side of explicit completeness: an analyzer may not report a complete or partial answer for input it never fully read. documentation/tests/e2e/packed/installed-sdk-source-analysis-input-limits.test.ts "enforces the installed SDK UTF-16 input limit using its public export and validator" exercises it.
