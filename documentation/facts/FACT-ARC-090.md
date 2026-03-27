---
id: FACT-ARC-090
title: Type Guard Pattern
status: active
tags: [quality, type-safety, validation, patterns]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Custom type guard function pattern: `function isType(data: unknown): data is Type { return typeof data === 'expected-shape' && 'required-field' in data; }`. Usage: `if (isType(unvalidatedData)) { const typed = unvalidatedData as Type; /* Safe to use typed */ }`.
