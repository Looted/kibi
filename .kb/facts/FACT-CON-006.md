---
id: FACT-CON-006
title: Test Video File Missing Issue
status: active
tags: [testing, e2e, test-data]
source: memory-bank/activeContext.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

E2E runs can fail locally if `small-test.mp4` is missing from repo root. Playwright helper uses this file for creating test videos.
