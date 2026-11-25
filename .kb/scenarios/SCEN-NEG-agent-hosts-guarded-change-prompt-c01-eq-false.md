---
title: Refused when claude pre edit hook asks person is false
status: active
expects: rejection
text_ref: REQ-agent-hosts-guarded-change-prompt
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:08:26.646Z'
id: SCEN-NEG-agent-hosts-guarded-change-prompt-c01-eq-false
type: scenario
---
Given a project where claude pre edit hook asks person is false, which REQ-agent-hosts-guarded-change-prompt forbids, then Kibi rejects that outcome, and TEST-agent-hosts-guarded-change-ask fails if the code allows it.
