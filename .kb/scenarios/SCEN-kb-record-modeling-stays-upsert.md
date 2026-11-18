---
title: A kb_record input with facts is refused, naming kb_upsert
status: active
expects: success
priority: must
tags:
  - kb-record
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:47.681Z'
id: SCEN-kb-record-modeling-stays-upsert
type: scenario
---
Given a kb_record input that also carries facts, when kb_record is called, then it is refused before anything is read or written, and the refusal names kb_upsert as the call that records facts, relationships, proof contracts and other modeling.
