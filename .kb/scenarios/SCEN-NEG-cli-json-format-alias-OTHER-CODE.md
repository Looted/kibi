---
title: '--json with another --format reported under a non-usage exit code is caught'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-22T17:47:37.029Z'
id: SCEN-NEG-cli-json-format-alias-OTHER-CODE
type: scenario
---
Given `--json` and an explicit `--format table` on the same command, refusing the pair with an exit code above 2 instead of the usage-error code 2 fails the suite.
