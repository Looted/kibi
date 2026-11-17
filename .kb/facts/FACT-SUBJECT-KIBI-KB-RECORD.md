---
title: Kibi kb_record
status: active
fact_kind: subject
subject_key: kibi.kb_record
canonical_key: kibi.kb_record
tags:
  - lane:strict
  - kb-record
origin:
  kind: agent
  recorded_at: '2026-11-17T06:41:24.522Z'
id: FACT-SUBJECT-KIBI-KB-RECORD
type: fact
---
The kb_record operation (MCP kb_record, CLI kibi record): it takes a stated rule, its reason, who stated it, their words, the code that implements it and an optional test, translates them into one kb_upsert payload, writes that payload through kb_upsert and returns the kb_check changed:true verdict. It is a translation over kb_upsert, not a second write path.
