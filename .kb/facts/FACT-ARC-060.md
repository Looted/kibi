---
id: FACT-ARC-060
title: Effect for Side Effects
status: active
tags: [design, signals, state-management]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Always use `effect()` for side effects instead of subscriptions. Effects are automatically cleaned up when component destroys.
