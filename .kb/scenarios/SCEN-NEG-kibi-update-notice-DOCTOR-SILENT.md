---
title: Kibi doctor reports a newer kibi-cli instead of staying silent
status: active
expects: rejection
tags:
  - negative-path
  - release
  - update-notice
origin:
  kind: agent
  recorded_at: '2026-11-04T13:26:28.806Z'
id: SCEN-NEG-kibi-update-notice-DOCTOR-SILENT
type: scenario
---
Given the npm registry names kibi-cli 2.42.0 while 2.41.0 is installed, when kibi doctor runs, then its Kibi updates row warns with both versions and the update command, and an offline registry is reported as neither a failure nor a warning. packages/cli/tests/update-check.test.ts "checkKibiUpdates (kibi doctor)" exercises it.

This is the failure side of the update notice requirement.