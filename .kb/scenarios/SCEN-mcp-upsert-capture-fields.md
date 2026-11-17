---
title: kb_upsert advertises the capture fields and the resource describes the rest
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
id: SCEN-mcp-upsert-capture-fields
type: scenario
---
Given the kb_upsert tool definition, when a host lists the tools, then its entity properties name the 15 capture fields only, and the kibi-usage operation-fields resource lists every entity field that is left out with its description.