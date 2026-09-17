---
id: SCEN-zcode-kibi-plugin-v1
title: 'ZCode Kibi Plugin v1: Optional Adapter Behaviors'
type: scenario
status: active
created_at: 2026-09-15T00:00:00.000Z
updated_at: 2026-09-15T00:00:00.000Z
source: .kb/scenarios/SCEN-zcode-kibi-plugin-v1.md
tags:
  - scenario
  - zcode
  - plugin
  - runtime
links:
  - type: verified_by
    target: TEST-zcode-kibi-plugin-v1
  - type: relates_to
    target: REQ-zcode-kibi-plugin-v1
---
An operator installs and enables kibi-zcode in a workspace that owns .kb/manifest.json.

The installed adapter exposes its ZCode plugin manifest, bundled Kibi skills, kibi-bootstrap command, advisory lifecycle hooks, and an MCP configuration that resolves the project-local kibi-mcp binary.

Project-local Kibi logic, command workflows, and MCP operations remain provided by kibi-core, kibi-cli, and kibi-mcp. Installing or enabling the adapter never modifies core Kibi runtime components, and the package remains optional.