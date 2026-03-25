---
id: FACT-TECH-015
title: IndexedDbReviewRepository Storage Adapter
status: active
tags: [storage, repository, indexeddb]
source: memory-bank/techContext.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

`IndexedDbReviewRepository` implements `ReviewRepository` interface for local-only persistence using IndexedDB. Stores reviews in AlignDB / reviews store. Injected via `REVIEW_REPOSITORY` token.
