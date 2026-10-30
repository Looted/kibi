---
title: check-generated rejects a commit that stages the symbol coordinate cache
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:44.081Z'
id: SCEN-NEG-symbol-coordinates-derived-locally-STAGED-COORDINATE-CACHE
type: scenario
---
Given a workspace whose symbol coordinate cache has been force-added to the index, when kibi check-generated runs on the staged changes, then it exits 1 saying the coordinates are derived locally and never committed, and leaves the index unchanged.

This is the failure side of locally derived coordinates: the cache is rebuilt from source and must never reach a commit. packages/cli/tests/commands/derived-symbol-coordinates.test.ts "check-generated rejects a commit that stages the coordinate cache" exercises it.
