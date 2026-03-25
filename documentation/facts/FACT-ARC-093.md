---
id: FACT-ARC-093
title: No Console Overrides Rule
status: active
tags: [logging, rules, best-practices]
source: memory-bank/logging.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Do not monkey-patch `window.console`. All logging must go through `LoggerService` to ensure production safety, consistent formatting, and integration with error monitoring.
