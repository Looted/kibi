---
title: ZCode stays silent in an unowned workspace
status: active
tags:
  - scenario
  - zcode
  - silence
id: SCEN-zcode-unowned-workspace-silence-v1
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
A resolved project root does not own .kb/manifest.json.

Every kibi-zcode lifecycle hook emits no output, and the kibi-zcode MCP endpoint exposes no tools in that workspace.