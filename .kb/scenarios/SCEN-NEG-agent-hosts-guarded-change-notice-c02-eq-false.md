---
title: Refused when opencode hook stops change once is false
status: active
expects: rejection
text_ref: REQ-agent-hosts-guarded-change-notice
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:08:46.420Z'
id: SCEN-NEG-agent-hosts-guarded-change-notice-c02-eq-false
type: scenario
---
Given a project where opencode hook stops change once is false, which REQ-agent-hosts-guarded-change-notice forbids, then Kibi rejects that outcome, and TEST-agent-hosts-guarded-change-ask fails if the code allows it.
