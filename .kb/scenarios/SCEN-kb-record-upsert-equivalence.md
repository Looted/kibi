---
title: kb_record matches kb_upsert of its payload then the changed check
status: active
expects: success
priority: must
tags:
  - kb-record
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:46.097Z'
id: SCEN-kb-record-upsert-equivalence
type: scenario
---
Given two identical knowledge bases, when one records a rule with kb_record and the other writes the payload kb_record returned with kb_upsert and then runs kb_check with changed:true for the same files, then both hold the same entities and relationships and report the same verdict; a kb_record dry run returns that payload and kb_upsert's dry run and writes nothing.
