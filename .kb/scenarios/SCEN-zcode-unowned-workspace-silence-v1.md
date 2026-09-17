---
title: ZCode stays silent in an unowned workspace
status: active
tags:
  - scenario
  - zcode
  - silence
id: SCEN-zcode-unowned-workspace-silence-v1
type: scenario
---
A resolved project root does not own .kb/manifest.json.

Every kibi-zcode lifecycle hook emits no output, and the kibi-zcode MCP endpoint exposes no tools in that workspace.