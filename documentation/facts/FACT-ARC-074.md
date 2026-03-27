---
id: FACT-ARC-074
title: Wait for Condition Not Timeout
status: active
tags: [testing, e2e, wait-strategies, best-practices]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Wait for conditions using Playwright's expect API instead of arbitrary timeouts. Example: `await expect(page.locator('[data-testid="result"]')).toBeVisible()`.
