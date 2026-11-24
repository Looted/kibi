---
title: '--json silently overriding an explicit --format is caught'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-22T17:45:50.724Z'
id: SCEN-NEG-cli-json-format-alias-SILENT
type: scenario
---
Given `--json` and an explicit `--format table` on the same command, running the command with exit code 0 instead of refusing the pair fails the suite.
