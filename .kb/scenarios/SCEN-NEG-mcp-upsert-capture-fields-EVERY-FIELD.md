---
title: kb_upsert that advertises every entity field is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
  - negative-path
id: SCEN-NEG-mcp-upsert-capture-fields-EVERY-FIELD
type: scenario
---
Given a kb_upsert definition that advertises every entity field of every entity type, when the tool list is checked, then it is rejected.