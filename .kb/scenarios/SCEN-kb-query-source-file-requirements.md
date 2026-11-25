---
title: A lookup by file returns the requirements its symbols implement
status: active
expects: success
priority: must
tags:
  - kb_query
  - source-file
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:02.303Z'
id: SCEN-kb-query-source-file-requirements
type: scenario
---
Given a file whose two symbols implement two requirements, when kb_query runs with that sourceFile, then it returns both symbols and both requirements, and with type req the two requirements.
