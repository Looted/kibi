---
title: A statement body without semantic_text records the statement as semantic_text
status: active
expects: success
tags:
  - kb_upsert
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:28.659Z'
id: SCEN-kb-upsert-statement-semantic-text
type: scenario
---
Given a requirement kb_upsert that sends a statement body and no semantic_text, when it is written, then the requirement's semantic_text is the statement from the body, without the Context and Source sections.