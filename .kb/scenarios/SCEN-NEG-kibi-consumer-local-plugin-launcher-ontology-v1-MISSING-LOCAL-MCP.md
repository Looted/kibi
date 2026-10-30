---
title: The launcher refuses to start another kibi-mcp when the consumer lacks one and says how to install it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:00:03.706Z'
id: SCEN-NEG-kibi-consumer-local-plugin-launcher-ontology-v1-MISSING-LOCAL-MCP
type: scenario
---
Given a Kibi consumer workspace whose package.json has no kibi-mcp dependency, when the packed Cursor plugin launcher is run for that workspace, then it exits 1, prints no server resolution, and its error names the workspace and the npm install --save-dev kibi-mcp command.

This is the failure side of consumer-local launching: a missing project-local server must not be replaced by a downloaded or borrowed one. documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts "refuses to start any other kibi-mcp when the consumer workspace lacks one, with an actionable error" exercises it.
