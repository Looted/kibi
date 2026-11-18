---
title: kb_upsert refuses to write an entity into a document that holds another one
status: active
tags: []
origin:
  kind: agent
  recorded_at: '2026-11-17T19:03:53.740Z'
id: SCEN-kb-upsert-refuse-write-entity-into
type: scenario
---
An agent upserts an entity whose source document already holds another entity, including one without an id; kb_upsert refuses and writes nothing.