---
title: A sync after source declarations move leaves symbols.yaml byte-identical
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T11:00:00.000Z'
id: SCEN-NEG-kibi-coordinate-refresh-split-COORDINATES-IN-MANIFEST
type: scenario
---
Given a committed project whose source declarations move on one branch while another branch edits a body, when the branches merge and sync runs, then symbol-coordinates.yaml carries the new lines and .kb/symbols.yaml is byte-identical to its committed content, with a clean working tree.

This is the failure side of the authored and generated split: a refresh never writes generated coordinates into the authored manifest. packages/cli/tests/commands/derived-symbol-coordinates.test.ts "parallel edits to one source file merge cleanly and sync rebuilds the cache" exercises it, inside the TEST-symbol-coordinates-derived-locally proof run.
