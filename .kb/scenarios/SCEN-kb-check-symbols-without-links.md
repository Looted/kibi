---
title: Changed symbols are listed without the links linkedEntities carries
status: active
tags:
  - check
  - cost
origin:
  kind: agent
  recorded_at: '2026-11-24T19:19:36.538Z'
id: SCEN-kb-check-symbols-without-links
type: scenario
---
Given a change to symbols that implement requirements, when kb_check returns its impact result, then each extractedSymbols entry gives the symbol's id, name, kind, role, location and changed ranges without linkedEntityIds, and linkedEntities lists every link with the symbol it comes from.
