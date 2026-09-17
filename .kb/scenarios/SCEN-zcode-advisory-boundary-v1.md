---
title: ZCode adapter stays inside the advisory boundary
status: active
tags:
  - scenario
  - zcode
  - advisory
  - boundary
id: SCEN-zcode-advisory-boundary-v1
type: scenario
---
kibi-zcode is installed and enabled in an owned workspace.

Adapter asset scope stays declarative and lifecycle-hook scope stays advisory: each output remains advisory, nothing writes directly under .kb, no MCP tooling behavior is replaced, and the adapter provides no hard enforcement gate of its own.