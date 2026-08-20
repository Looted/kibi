---
id: FACT-ARC-018
title: State Management with RxJS and Signals
status: active
tags: [architecture, state-management, signals, rxjs]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-03-25T00:00:00Z
fact_kind: meta
---

The example product uses a hybrid state management approach: RxJS for legacy services with Angular Signals for new component development. Local component state uses signals exclusively, while services may still expose RxJS observables that are converted to signals via `toSignal()` in components.
