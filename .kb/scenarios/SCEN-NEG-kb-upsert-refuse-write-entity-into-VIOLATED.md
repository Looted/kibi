---
title: 'Documents get mixed: kb_upsert writes into another entity''s document'
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-17T19:03:54.489Z'
id: SCEN-NEG-kb-upsert-refuse-write-entity-into-VIOLATED
type: scenario
---
kb_upsert writes an entity into an authored document that already holds another entity.

This is the failure side kb_upsert must not produce; TEST-kb-upsert-source-entity-guard checks it.