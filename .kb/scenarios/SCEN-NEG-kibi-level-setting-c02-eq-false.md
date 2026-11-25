---
title: Refused when level is remember or test default test is false
status: active
expects: rejection
text_ref: REQ-kibi-level-setting
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:19:19.905Z'
id: SCEN-NEG-kibi-level-setting-c02-eq-false
type: scenario
---
Given a project where level is remember or test default test is false, which REQ-kibi-level-setting forbids, then Kibi rejects that outcome, and TEST-kibi-level-setting fails if the code allows it.
