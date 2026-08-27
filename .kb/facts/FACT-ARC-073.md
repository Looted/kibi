---
id: FACT-ARC-073
title: Dismissing UI Overlays Pattern
status: active
tags: [testing, e2e, overlays, test-setup]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Dismiss UI overlays via localStorage to prevent interference with tests. Example: `await page.addInitScript(() => { localStorage.setItem('hasSeenIntro', 'true'); });`.
