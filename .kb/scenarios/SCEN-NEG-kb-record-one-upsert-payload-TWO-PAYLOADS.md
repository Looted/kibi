---
title: A kb_record that writes two payloads is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:51.236Z'
id: SCEN-NEG-kb-record-one-upsert-payload-TWO-PAYLOADS
type: scenario
---
Given a kb_record that writes its requirement through two kb_upsert payloads, when it is checked, then it is refused: kb_record must write exactly one kb_upsert payload.
