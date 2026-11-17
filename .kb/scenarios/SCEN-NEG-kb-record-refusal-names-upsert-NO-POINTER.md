---
title: A field refusal that does not name kb_upsert is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:17.177Z'
id: SCEN-NEG-kb-record-refusal-names-upsert-NO-POINTER
type: scenario
---
Given a kb_record refusal of a facts field that does not name kb_upsert, when it is checked, then it is refused: the refusal must name kb_upsert as the call for facts, relationships, proof contracts and other modeling.
