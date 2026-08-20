---
id: FACT-ACT-012
title: Optimistic Auto-Save Feature
status: active
tags: [active-context, features, auto-save]
source: memory-bank/activeContext.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: observation
---

Refactored `VideoPlayer` to emit `onAutoSave` event when annotations are saved. Consolidated toast notifications. Updated `ReviewService` with `updateReview` method for partial updates. Refactored `InstructorDashboard` to create drafts immediately and handle `onAutoSave` and `onFinishReview` events.
