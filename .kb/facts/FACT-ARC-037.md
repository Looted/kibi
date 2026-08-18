---
id: FACT-ARC-037
title: Never Use BehaviorSubject for State Management
status: active
tags: [forbidden, state-management, signals]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Use `signal()` for state management instead of `BehaviorSubject`. Signals are simpler, more performant, and aligned with Angular 21+ reactive patterns.
