---
title: Separate findings for one unowned declaration fail the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: SCEN-NEG-check-staged-owner-block-SPLIT
type: scenario
---
Given the same commit, a staged check that prints the manifest, impact-evidence, semantic-review or traceability finding of the function next to its block fails the test's assertions.

## Context

The failure side of the one-block rule.