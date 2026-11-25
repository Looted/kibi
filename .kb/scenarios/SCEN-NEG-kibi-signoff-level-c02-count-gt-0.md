---
title: Refused when guarded changes left out of decisions is above 0
status: active
expects: rejection
text_ref: REQ-kibi-signoff-level
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T13:57:30.022Z'
id: SCEN-NEG-kibi-signoff-level-c02-count-gt-0
type: scenario
---
Given a project where guarded changes left out of decisions is above 0, which REQ-kibi-signoff-level forbids, then Kibi rejects that outcome, and TEST-kibi-signoff-level fails if the code allows it.
