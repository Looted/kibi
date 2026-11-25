---
title: Refused when tool routes that write level is above 0
status: active
expects: rejection
text_ref: REQ-kibi-level-setting
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:19:37.411Z'
id: SCEN-NEG-kibi-level-setting-c03-gt-0
type: scenario
---
Given a project where tool routes that write level is above 0, which REQ-kibi-level-setting forbids, then Kibi rejects that outcome, and TEST-kibi-level-setting fails if the code allows it.
