---
title: A develop push with other files than the train runs the full proof
status: active
expects: rejection
tags:
  - ci
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:50:15.531Z'
id: SCEN-NEG-ci-proof-reuse-train-merge-VIOLATED
type: scenario
---
The develop commit is not a merge of a train head, its train has no unique successful proof run, the run or its attestation names another head or base, or the snapshots differ. The push does not reuse the train's proof and runs the full proof.