---
id: FACT-ARC-070
title: E2E webServer Configuration
status: active
tags: [testing, playwright, e2e, configuration]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

E2E tests use Playwright's built-in `webServer` configuration which auto-builds and serves E2E app on port 4203 via http-server. No manual Angular dev server is required.
