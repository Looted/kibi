---
id: FACT-ARC-045
title: Always Use Effect for Side Effects
status: active
tags: [required, state-management, signals]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Always use `effect()` for side effects instead of subscriptions. Effects are automatically cleaned up when component destroys.
