---
title: OpenCode v1 and v2 both load kibi-opencode from one package
status: active
id: SCEN-opencode-v2-plugin-load
type: scenario
origin:
  kind: human
  ref: github:Looted/kibi#509
  recorded_at: '2026-10-19T19:00:00.000Z'
tags:
  - opencode
  - plugin-api
---
## Scenario

A developer lists `kibi-opencode` in the OpenCode `plugin` config and starts either OpenCode v1 or OpenCode v2.

### Steps

1. OpenCode v1 (1.4 or later) imports the package, reads `server` from the default export, and calls it with the legacy plugin input.
2. OpenCode v2 imports the package, validates the default export as `{ id, setup }`, and calls `setup` with its domain context.
3. On v2, Kibi guidance is added through the session context hook, tool telemetry and file lifecycle events arrive through the tool execute-after hook, and `/kibi-bootstrap` is registered as a command.
4. The OpenCode v2 TUI loads the `kibi-opencode/tui` entry without rejecting it.

### Expected

Both hosts load the plugin without errors. If a v2 hook fails to register, the remaining hooks still register and the failure is reported.
