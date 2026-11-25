---
title: Refused when provable code skill offered at remember is true
status: active
expects: rejection
text_ref: REQ-kibi-remember-level-surface
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:20:37.855Z'
id: SCEN-NEG-kibi-remember-level-surface-c02-eq-true
type: scenario
---
Given a project where provable code skill offered at remember is true, which REQ-kibi-remember-level-surface forbids, then Kibi rejects that outcome, and TEST-kibi-remember-level-surface fails if the code allows it.
