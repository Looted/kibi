---
title: A statement body left without semantic_text is refused
status: active
expects: rejection
tags:
  - negative-path
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:23:35.581Z'
id: SCEN-NEG-kb-upsert-statement-semantic-text-NO-SEMANTIC-TEXT
type: scenario
---
Given a requirement written with a statement body that is left without semantic_text, when it is checked, then it is refused: the statement must be recorded as semantic_text.