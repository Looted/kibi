---
title: kb_check changed:true gives a verdict the commit gate would not, or changes the real index fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
id: SCEN-NEG-check-changed-commit-verdict-DIFFERS
type: scenario
---
Given the same repository, a kb_check changed:true or kibi check --changed whose verdict differs from what kibi check --staged gives once the same changes are staged, or that leaves anything staged in the real index, fails the test's assertions.

## Context

The failure side of REQ-check-changed-commit-verdict.