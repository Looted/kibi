---
title: A build workflow with build and smoke jobs for all five launch targets passes the workflow contract
status: active
expects: success
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:49:57.396Z'
id: SCEN-CASE-prolog-build-pipeline-validation-FIVE-LAUNCH-TARGETS
type: scenario
---
Given a build workflow declaring separate build and smoke jobs for all five launch targets (linux-x64-gnu, linux-arm64-gnu, darwin-arm64, darwin-x64, win32-x64), when the workflow contract is checked, then it passes: five is the accepted set, with win32-x64 repackaged on windows-2025. scripts/tests/swipl-build-pipeline.test.ts covers the five-target matrix and still rejects unknown targets.