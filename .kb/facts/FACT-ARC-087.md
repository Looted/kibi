---
id: FACT-ARC-087
title: Responsive Layout Duplicate Elements
status: active
tags: [design, responsive, best-practices]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

> [!IMPORTANT] Responsive layouts may render the same interactive elements in BOTH portrait and landscape modes. Both are in the DOM, with CSS hiding the non-active one.

Solution: Always use `:visible` and `.first()` to target only the visible element. Example: `const button = page.locator("[data-testid='action-button']:visible").first();`.
