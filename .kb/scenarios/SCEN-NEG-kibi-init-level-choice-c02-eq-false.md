---
title: Refused when init without terminal records flag or test is false
status: active
expects: rejection
text_ref: REQ-kibi-init-level-choice
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:20:56.715Z'
id: SCEN-NEG-kibi-init-level-choice-c02-eq-false
type: scenario
---
Given a project where init without terminal records flag or test is false, which REQ-kibi-init-level-choice forbids, then Kibi rejects that outcome, and TEST-kibi-init-level-choice fails if the code allows it.
