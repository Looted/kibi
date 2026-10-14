---
title: An upsert that changes a requirement's statement rewrites the body statement
status: active
priority: must
tags:
  - kb
  - upsert
origin:
  kind: agent
  recorded_at: '2026-10-14T14:43:05.771Z'
id: SCEN-kb-upsert-statement-follows-semantic-text
type: scenario
---
Given a requirement document whose body states "Kibi must reject a swipl older than version 9.0." followed by a Context section, when kb_upsert changes only its semantic_text to the 10.0 floor, then the body's statement reads the 10.0 floor, the 9.0 sentence is gone and the Context section is unchanged.

Given the same document, when kb_upsert changes only its status, then the body is unchanged byte for byte.

This exists because an agent that recorded a changed decision with kb_upsert left the old statement in the body, and kb_search quoted that old statement to a later agent, which then reverted the change.
