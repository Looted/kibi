---
id: FACT-ARC-059
title: Computed for Derived State
status: active
tags: [design, signals, state-management]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Always use `computed()` for derived state instead of manual calculation or subscription chains. Computed signals automatically recompute when dependencies change.
