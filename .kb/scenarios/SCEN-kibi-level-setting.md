---
title: The project's Kibi level is read from package.json, else .kb/setup.json, and is test when unset
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:02.399Z'
id: SCEN-kibi-level-setting
type: scenario
---
Given a root package.json with kibi.level remember, Kibi reads remember; given no root package.json and level remember in .kb/setup.json, Kibi reads remember; given neither, Kibi reads test. No MCP tool or CLI JSON route writes the level; only kibi init does.
