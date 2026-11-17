---
title: Two files exporting one name get distinct record ids
status: active
origin:
  kind: agent
  recorded_at: '2026-11-17T19:07:16.808Z'
id: SCEN-symbol-id-minting
type: scenario
---
Two files export a type of the same name; the staged check offers each a record id no entity holds, and kb_upsert implementedBy mints an id next to stored ones.