---
title: A steps file named after one test that declares another is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T07:29:36.135Z'
id: SCEN-NEG-kibi-proof-step-settings-MISNAMED-FILE
type: scenario
---
Given proof/steps/TEST-a.json whose test_id is TEST-b, when kibi proof run-steps reads the directory, then it refuses with a message naming the file and the declared test_id, and runs nothing. packages/cli/tests/proof/step-runner-mutation.test.ts exercises it.