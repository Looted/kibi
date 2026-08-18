---
id: FACT-ARC-089
title: Runtime Validation at I/O Boundaries
status: active
tags: [quality, type-safety, validation, best-practices]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Use `unknown` for unvalidated external data (e.g., IndexedDB, Supabase responses). Create custom type guard functions for complex external library data structures.
