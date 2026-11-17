---
title: A test falls between shards
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:31.693Z'
id: SCEN-NEG-cli-prove-shard-disjoint-parts-VIOLATED
type: scenario
---
The shards drop a selected test or both prove it, so the combined run is not one full run.

This is the failure side `--shard` must not produce; packages/cli/tests/commands/prove-shard.test.ts checks it.