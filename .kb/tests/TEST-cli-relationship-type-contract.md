---
title: CLI relationship type vocabulary contract
status: active
tags:
  - cli
  - relationships
  - types
  - unit
verification_scope: unit
verification_perspective: internal
id: TEST-cli-relationship-type-contract
type: test
links:
  - type: validates
    target: SCEN-mcp-relationship-preflight
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Imports the exported relationship configuration and type contract, then asserts the complete supported relationship vocabulary.