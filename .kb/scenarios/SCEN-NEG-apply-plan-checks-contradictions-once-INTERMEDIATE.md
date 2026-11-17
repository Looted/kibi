---
title: A plan is refused for a contradiction between its own steps
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:54.133Z'
id: SCEN-NEG-apply-plan-checks-contradictions-once-INTERMEDIATE
type: scenario
---
A plan moves a fact and then the fact of the requirement it conflicts with, and is refused after its first step although the finished plan is consistent.

This is the failure side the write must not produce; TEST-upsert-stale-siblings checks it.