---
title: 'Records get moved: a minted symbol id is already held'
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-17T19:07:17.785Z'
id: SCEN-NEG-symbol-id-minting-VIOLATED
type: scenario
---
A minted symbol id is the id of another file's record, so writing it moves that record.

This is the failure side the id minting must not produce; TEST-symbol-id-minting checks it.