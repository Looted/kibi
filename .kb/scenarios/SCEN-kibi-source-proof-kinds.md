---
title: A maintainer proves route, configuration, schema and temporal claims against what Kibi reads
status: active
priority: should
tags:
  - proof
  - certificate
  - source
origin:
  kind: agent
  recorded_at: '2026-10-26T17:38:47.794Z'
id: SCEN-kibi-source-proof-kinds
type: scenario
---
Given requirements whose claims the semantic advisor models as set facts ("Every route under /api must use requireAuth", "Every environment variable the app reads must be one of DATABASE_URL, PORT or SECRET", "Every table must have id and created_at") and as temporal state machine facts ("A cancelled invoice can never become paid", "Every path from draft to paid must pass through approved"), when the maintainer runs kibi prove on source and state_machine tests whose proof contracts name those claims, then Kibi reads the app's routes, the configuration's environment variables, the SQL migrations and the transition table itself, and the tests get derived claim bindings at evidence level proved. A route without the middleware is rejected with the route, and after the code reads a variable the requirement does not allow, a re-run rejects the claim with that variable.