---
title: The builtin TypeScript provider decides symbols from each file's own syntax
status: active
expects: success
tags:
  - plugins
  - symbols
  - typescript
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
id: SCEN-kibi-builtin-ts-syntactic-parse
type: scenario
---
Given a TypeScript file that imports another module and exports names through declarations and a local export list, the provider's project is created with noLib, noResolve and no types, adds only that file, and still reports every exported name.