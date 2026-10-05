---
title: Doctor diagnoses environment before init and passes after init
status: active
tags:
  - cli
  - doctor
  - e2e
id: SCEN-cli-doctor
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Doctor reports capability-plugin activation, dependency declaration, secret source labels (process/project_env/user_env/missing) without values, and remediation when declared secrets are missing. After init, environment and KB health checks pass.
