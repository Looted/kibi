---
title: The builtin TypeScript provider loads library declarations or resolves imports to decide symbols fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - plugins
  - symbols
  - typescript
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
id: SCEN-NEG-kibi-builtin-ts-syntactic-parse-RESOLVES
type: scenario
---
Given the same file, a project created with library declarations or import resolution, or one that adds the imported file, fails the test's assertions.

## Context

The failure side of REQ-kibi-builtin-ts-syntactic-parse.