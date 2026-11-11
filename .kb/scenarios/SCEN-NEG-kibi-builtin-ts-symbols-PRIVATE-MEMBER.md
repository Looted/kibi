---
title: 'Private and #-prefixed members are left out of the symbols'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-builtin-ts-symbols-PRIVATE-MEMBER
type: scenario
---
Given the same class with a private hide method and a #secret method, when the builtin ts-morph extractor analyzes it, then neither hide nor #secret appears among the symbols.

This is the failure side of builtin TypeScript symbols. documentation/tests/e2e/capability-plugins.e2e.ts, in its builtin providers section, exercises it.
