---
title: A secret loaded from .env.kibi is never attributed to the process
status: active
priority: must
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-04T15:08:17.673Z'
id: SCEN-NEG-kibi-env-bootstrap-PROCESS-ONLY
type: scenario
---
Given a secret only in the project .env.kibi and another only in the shell environment
When the packed Kibi env bootstrap has loaded both into the process env
Then attribution refuses to call the file-loaded secret a process value: it reports project_env for it, process for the shell one and missing for an absent key, and no label carries a secret value.

This is the failure side of doctor secret attribution. documentation/tests/e2e/packed/cli-env-bootstrap.test.ts "doctor attributes a file-loaded secret to its file, not to the process" exercises it.
