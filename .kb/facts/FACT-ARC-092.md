---
id: FACT-ARC-092
title: Service Contract Typing
status: active
tags: [quality, type-safety, services, patterns]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Services use interface-first design with `InjectionToken<T>` for DI. Expose signals via `.asReadonly()` getters for encapsulation. Use explicit types for method parameters and return values on public APIs.
