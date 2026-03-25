---
id: FACT-ARC-030
title: Annotation Persistence Debouncing
status: active
tags: [data-flow, persistence, debouncing]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Annotations are saved via `AnalysisService` with debouncing to prevent excessive storage operations during active annotation editing.
