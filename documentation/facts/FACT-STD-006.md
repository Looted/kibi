---
id: FACT-STD-006
title: Service Abstraction Interfaces
status: active
tags: [architecture, services, abstraction]
source: memory-bank/techContext.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Backend-agnostic interfaces define external data operations (`AuthService`, `DataService`, `ReviewRepository`). Allows swapping backend implementations without touching UI code.
