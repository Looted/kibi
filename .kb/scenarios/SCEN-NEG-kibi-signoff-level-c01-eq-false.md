---
title: Refused when shows project level is false
status: active
expects: rejection
text_ref: REQ-kibi-signoff-level
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T13:45:10.294Z'
id: SCEN-NEG-kibi-signoff-level-c01-eq-false
type: scenario
---
Given a project where shows project level is false, which REQ-kibi-signoff-level forbids, then Kibi rejects that outcome, and TEST-kibi-signoff-level fails if the code allows it.
