---
title: A pull request that changes code starts its full proof at once
status: active
expects: success
tags:
  - ci
  - proof
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:14.538Z'
id: SCEN-ci-proof-reuse-no-wait-on-changed-tree
type: scenario
---
A pull request into develop changes a file the proof snapshot covers while develop's own proof of the base is still running. The reuse check sees that the merge's committed snapshot differs from the base's, records an execute decision with that reason, and the full proof starts without waiting or looking up develop's run.