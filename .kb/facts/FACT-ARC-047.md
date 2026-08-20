---
id: FACT-ARC-047
title: Component State Reset on Input Change
status: active
tags: [components, signals, on-push]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

When using `input()` signals, Angular may reuse component instances (especially in `@for` loops). Always use `effect()` to watch for input changes and reset internal state.
