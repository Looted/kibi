---
title: Refused when floor above level reported at remember is false
status: active
expects: rejection
text_ref: REQ-kibi-required-evidence-at-remember
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:20:10.999Z'
id: SCEN-NEG-kibi-required-evidence-at-remember-c01-eq-false
type: scenario
---
Given a project where floor above level reported at remember is false, which REQ-kibi-required-evidence-at-remember forbids, then Kibi rejects that outcome, and TEST-kibi-required-evidence-at-remember fails if the code allows it.
