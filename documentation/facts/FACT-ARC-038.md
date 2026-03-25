---
id: FACT-ARC-038
title: Never Use Manual Change Detection
status: active
tags: [forbidden, change-detection, signals]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Never use `ChangeDetectorRef.detectChanges()`, `NgZone.run()`, or `markForCheck()`. Signals with OnPush handle reactivity automatically. Manual change detection indicates underlying reactivity problem.
