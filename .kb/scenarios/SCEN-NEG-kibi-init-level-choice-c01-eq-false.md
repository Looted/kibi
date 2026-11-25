---
title: Refused when init asks level at terminal test recommended is false
status: active
expects: rejection
text_ref: REQ-kibi-init-level-choice
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:20:51.052Z'
id: SCEN-NEG-kibi-init-level-choice-c01-eq-false
type: scenario
---
Given a project where init asks level at terminal test recommended is false, which REQ-kibi-init-level-choice forbids, then Kibi rejects that outcome, and TEST-kibi-init-level-choice fails if the code allows it.
