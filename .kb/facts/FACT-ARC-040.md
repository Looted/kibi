---
id: FACT-ARC-040
title: Never Use Async Pipe
status: active
tags: [forbidden, templates, signals]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Do not use `async` pipe with observables. Convert observables to signals with `toSignal()` for template reactivity.
