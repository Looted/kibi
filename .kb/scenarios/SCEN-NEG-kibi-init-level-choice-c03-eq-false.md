---
title: Refused when bootstrap skill asks level before init is false
status: active
expects: rejection
text_ref: REQ-kibi-init-level-choice
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:21:02.434Z'
id: SCEN-NEG-kibi-init-level-choice-c03-eq-false
type: scenario
---
Given a project where bootstrap skill asks level before init is false, which REQ-kibi-init-level-choice forbids, then Kibi rejects that outcome, and TEST-kibi-init-level-choice fails if the code allows it.
