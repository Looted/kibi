---
title: A requirement write lists at most five related current requirements
status: active
expects: success
tags:
  - kb_upsert
  - supersession
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:34.532Z'
id: SCEN-kb-upsert-related-requirements-cap
type: scenario
---
Given seven current requirements that share most of their terms with a new requirement, when the new requirement is written, then the result lists five of them, highest overlap first, each with its id and statement.