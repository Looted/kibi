---
title: Refused when vibe hook tells agent after change is false
status: active
expects: rejection
text_ref: REQ-vibe-guarded-change-after-notice
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:08:55.515Z'
id: SCEN-NEG-vibe-guarded-change-after-notice-c01-eq-false
type: scenario
---
Given a project where vibe hook tells agent after change is false, which REQ-vibe-guarded-change-after-notice forbids, then Kibi rejects that outcome, and TEST-agent-hosts-guarded-change-ask fails if the code allows it.
