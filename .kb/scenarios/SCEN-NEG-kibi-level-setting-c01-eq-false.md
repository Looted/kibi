---
title: Refused when reads package json then setup json is false
status: active
expects: rejection
text_ref: REQ-kibi-level-setting
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:19:25.793Z'
id: SCEN-NEG-kibi-level-setting-c01-eq-false
type: scenario
---
Given a project where reads package json then setup json is false, which REQ-kibi-level-setting forbids, then Kibi rejects that outcome, and TEST-kibi-level-setting fails if the code allows it.
