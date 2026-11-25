---
title: Refused when schema 20 note says how to choose remember is false
status: active
expects: rejection
text_ref: REQ-kibi-schema-20-level
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:19:45.338Z'
id: SCEN-NEG-kibi-schema-20-level-c02-eq-false
type: scenario
---
Given a project where schema 20 note says how to choose remember is false, which REQ-kibi-schema-20-level forbids, then Kibi rejects that outcome, and TEST-kibi-schema-20-level fails if the code allows it.
