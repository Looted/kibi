---
title: At level remember a tested or proved floor is reported, not enforced
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:41.098Z'
id: SCEN-kibi-required-evidence-at-remember
type: scenario
---
Given a project at level remember with a current requirement whose required_evidence is tested, when kibi check runs, then it reports rule.required-evidence-above-level as non-blocking advice naming the level, runs no evidence-floor rule, and passes.
