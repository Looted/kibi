---
title: Refused when fails only on canonical findings is false
status: active
expects: rejection
text_ref: REQ-kibi-check-rule-selection-by-level
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:21:10.050Z'
id: SCEN-NEG-kibi-check-rule-selection-c03-eq-false
type: scenario
---
Given a project where fails only on canonical findings is false, which REQ-kibi-check-rule-selection-by-level forbids, then Kibi rejects that outcome, and TEST-kibi-check-rule-selection-by-level fails if the code allows it.
