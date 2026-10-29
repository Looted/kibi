---
title: An upsert that authors symbol coordinates is refused and the generated coordinates stay
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:00:01.453Z'
id: SCEN-NEG-generated-coordinate-persistence-AUTHORED-COORDINATES
type: scenario
---
Given a synced symbol whose coordinates were generated from its source file, when kibi upsert is asked to write sourceLine and sourceColumn for that symbol, then the write is refused naming the unknown coordinate properties, the authored symbols.yaml is unchanged, and a query still returns the generated coordinates.

This is the failure side of generated coordinate ownership: callers must not author coordinate fields through kb_upsert. documentation/tests/e2e/packed/source-relationship-parity.test.ts "refuses an upsert that authors symbol coordinates and keeps the generated ones" exercises it.
