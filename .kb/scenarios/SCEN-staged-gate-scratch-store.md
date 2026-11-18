---
title: The staged gate keeps its scratch store in memory and judges only staged proofs
status: active
expects: success
tags:
  - check
  - staged
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
id: SCEN-staged-gate-scratch-store
type: scenario
---
Given a temporary store created for the staged check, a write is sent without kb_save; given staged requirements, the evidence floor query names only their ids and the engine evaluates only those of them it holds as requirements, once each.