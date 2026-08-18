---
id: FACT-ARC-088
title: Page Closure Error Handling
status: active
tags: [quality, e2e, error-handling, reliability]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

When writing shared helpers, guard against page closure. Example: try { await element.click(); } catch (e) { if (!page.isClosed()) { /_ Handle error _/ } }.
