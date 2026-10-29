---
title: A plan whose authoritative source plans nothing is not marked ready
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:36.074Z'
id: SCEN-NEG-bootstrap-intent-claim-accounting-EMPTY-AUTHORITATIVE-SOURCE
type: scenario
---
Given two authoritative knowledge sources where one has declared claims and the other plans nothing, when the bootstrap planner builds the plan, then it reports the claims per source and refuses to mark the plan ready.

This is the failure side of the ready gate: a plan that silently drops an authoritative source must not be applied. packages/cli/tests/operations/bootstrap-write-failures.test.ts "the plan reports declared claims per source and is not ready when an authoritative source plans nothing" exercises it.
