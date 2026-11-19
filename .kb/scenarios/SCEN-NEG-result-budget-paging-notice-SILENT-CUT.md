---
title: 'Failure side: a cut result says what it left out and how to page on'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-result-budget-paging-notice-SILENT-CUT
type: scenario
---
Given the same cut, a result without the counts, the next offset or the next action fails the unit and parity tests' assertions.

## Context

The failure side of REQ-result-budget-paging-notice.