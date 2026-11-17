---
title: A kb_record that writes outside kb_upsert is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:10.004Z'
id: SCEN-NEG-kb-record-one-upsert-payload-NO-PAYLOAD
type: scenario
---
Given a kb_record that writes its requirement without running a kb_upsert payload, when it is checked, then it is refused: kb_record must write exactly one kb_upsert payload.
