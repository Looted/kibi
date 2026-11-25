---
title: Refused when level writes by schema 20 upgrade is not 0
status: active
expects: rejection
text_ref: REQ-kibi-schema-20-level
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:19:51.729Z'
id: SCEN-NEG-kibi-schema-20-level-c01-neq-0
type: scenario
---
Given a project where level writes by schema 20 upgrade is not 0, which REQ-kibi-schema-20-level forbids, then Kibi rejects that outcome, and TEST-kibi-schema-20-level fails if the code allows it.
