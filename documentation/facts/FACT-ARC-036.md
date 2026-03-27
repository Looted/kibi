---
id: FACT-ARC-036
title: Service-Repository Pattern
status: active
tags: [architecture, services, repository]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Services inject repository interfaces via DI tokens. Example: `ReviewService` uses `REVIEW_REPOSITORY` (implemented by `IndexedDbReviewRepository`). Enables storage backend swapping.
