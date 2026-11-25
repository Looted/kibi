---
title: Refused when floor raising writes accepted at remember is above 0
status: active
expects: rejection
text_ref: REQ-kibi-required-evidence-at-remember
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:20:16.608Z'
id: SCEN-NEG-kibi-required-evidence-at-remember-c02-gt-0
type: scenario
---
Given a project where floor raising writes accepted at remember is above 0, which REQ-kibi-required-evidence-at-remember forbids, then Kibi rejects that outcome, and TEST-kibi-required-evidence-at-remember fails if the code allows it.
