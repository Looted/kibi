---
title: A store under a long punctuated path writes its journal
status: active
expects: success
priority: must
tags:
  - core
  - persistence
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:20.594Z'
id: SCEN-core-journal-file-name-fits
type: scenario
---
Given a branch store directory whose file:// URI is at most 200 characters but would percent-encode to a journal file name over 255 bytes, when Kibi attaches it, writes an entity, saves, detaches and attaches it again, then the store uses the urn:kibi:store:<sha1> graph URI, the engine keeps running and the entity is read back.