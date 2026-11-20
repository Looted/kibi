---
title: A build workflow with build and smoke jobs for more than five launch targets fails the workflow contract
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-20T12:22:46.329Z'
id: SCEN-NEG-prolog-build-pipeline-validation-SIX-LAUNCH-TARGETS
type: scenario
---
Given a build workflow declaring separate build and smoke jobs for six or more launch targets, when the workflow contract is checked, then it fails: exactly five targets are accepted (linux-x64-gnu, linux-arm64-gnu, darwin-arm64, darwin-x64, win32-x64). scripts/tests/swipl-build-pipeline.test.ts covers the rejection.