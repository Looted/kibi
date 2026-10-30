---
title: Simultaneous clients for one workspace and branch never get a second writer engine
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:39.577Z'
id: SCEN-CASE-core-journaled-engine-persistence-SECOND-WRITER
type: scenario
---
Given two engine clients for the same workspace and branch, when both start at the same time and write overlapping entities, then both attach to one daemon with the same process id, every write lands in that one engine, and both writes replay after a crash.

This covers the edge case of more than one writer engine per workspace and branch, the value past the bound `gt 1`: the second start is folded into the first writer. packages/cli/tests/engine.test.ts "serializes simultaneous clients onto one daemon and replays writes" exercises it.
