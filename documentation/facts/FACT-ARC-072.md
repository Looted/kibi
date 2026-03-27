---
id: FACT-ARC-072
title: Selector Priority Order
status: active
tags: [testing, e2e, selectors, best-practices]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Selector priority: 1) `data-testid` attributes (most reliable), 2) `:visible` pseudo-selector for disambiguation, 3) Text selectors only when unique, 4) CSS selectors as last resort.
