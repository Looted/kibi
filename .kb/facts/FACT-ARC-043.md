---
id: FACT-ARC-043
title: Always Use OnPush Change Detection
status: active
tags: [required, components, signals]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Always set `changeDetection: ChangeDetectionStrategy.OnPush` on components. Required for signals to work efficiently.
