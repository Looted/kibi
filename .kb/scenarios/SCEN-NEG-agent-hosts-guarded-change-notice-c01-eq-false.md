---
title: Refused when codex cursor zcode pre edit hooks tell agent to ask is false
status: active
expects: rejection
text_ref: REQ-agent-hosts-guarded-change-notice
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:08:40.527Z'
id: SCEN-NEG-agent-hosts-guarded-change-notice-c01-eq-false
type: scenario
---
Given a project where codex cursor zcode pre edit hooks tell agent to ask is false, which REQ-agent-hosts-guarded-change-notice forbids, then Kibi rejects that outcome, and TEST-agent-hosts-guarded-change-ask fails if the code allows it.
