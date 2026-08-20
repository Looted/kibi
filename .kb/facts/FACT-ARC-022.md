---
id: FACT-ARC-022
title: Service Abstraction Pattern
status: active
tags: [architecture, services, abstraction]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-03-25T00:00:00Z
fact_kind: meta
---

All external data operations (Auth, Storage, Database) are defined as abstract classes or interfaces. This design allows backend swapping without touching UI code. Services implement these interfaces and are injected via DI tokens.
