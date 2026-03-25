---
id: FACT-ARC-071
title: Reliable Element Selection with Visible Pseudo-Selector
status: active
tags: [testing, e2e, selectors, reliability]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

When elements exist but only one is visible (responsive design), use visibility-aware selectors. Example: `await page.locator('[data-testid="action-button"]:visible').first()`.
