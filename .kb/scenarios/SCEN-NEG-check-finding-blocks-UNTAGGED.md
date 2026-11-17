---
title: A kb_check finding does not say what it blocks fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
id: SCEN-NEG-check-finding-blocks-UNTAGGED
type: scenario
---
Given the same checks, a finding returned without a blocks field, or with a value other than commit, merge or none, fails the test's assertions.

## Context

The failure side of REQ-check-finding-blocks.