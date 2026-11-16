---
title: Proving a selection with nothing to prove needs no proof configuration
status: active
expects: success
priority: should
tags:
  - proof
  - cli
origin:
  kind: agent
  recorded_at: '2026-11-16T13:35:27.426Z'
id: SCEN-cli-prove-empty-selection
type: scenario
---
Given a repository with no .kb/proof/integrations.json and no proof-bearing test, when an agent runs kibi prove --all, then the command prints {"passed":0,"certified":0,"failed":0,"message":"no proof-bearing tests selected"} and exits 0. If a selected test carries a proof contract, the same command still fails with the missing-configuration error and the kibi proof inspect fix.