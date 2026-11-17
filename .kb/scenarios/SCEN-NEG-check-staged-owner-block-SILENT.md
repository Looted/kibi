---
title: A refusal without an owner block fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: SCEN-NEG-check-staged-owner-block-SILENT
type: scenario
---
Given the same commit, a staged check that refuses it without a [BLOCKS COMMIT] block naming the function, or with a block that picks one requirement instead of listing the candidates, fails the test's assertions.

## Context

The failure side where the block is missing.