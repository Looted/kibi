---
id: FACT-CON-009
title: Component Reuse Pattern Violation Fix
status: active
tags: [quality, bugs, component-reuse]
source: memory-bank/activeContext.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Fixed component reuse pattern violation where component instances were persisting and not resetting internal state. Now uses `effect()` to watch for input changes.
