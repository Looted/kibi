---
id: FACT-ARC-049
title: Avoid NgModel for Forms
status: active
tags: [forbidden, forms, signal-based-forms]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Avoid `FormsModule/ngModel` for forms. Migrate to signal-based forms using `[value]` and `(change)` bindings instead.
