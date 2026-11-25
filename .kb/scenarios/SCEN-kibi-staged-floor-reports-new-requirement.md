---
title: At level test the commit gate reports a requirement the commit adds below its floor
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:58.346Z'
id: SCEN-kibi-staged-floor-reports-new-requirement
type: scenario
---
Given a project at level test and a commit that adds a requirement whose required_evidence is tested and that has no passing test yet, when kibi check --staged runs, then it reports the evidence-floor finding as non-blocking and the commit passes.
