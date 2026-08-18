---
id: FACT-ARC-029
title: Video Analysis Data Flow
status: active
tags: [data-flow, analysis, playback]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Analysis flow: Instructor loads video -> `VideoController` manages playback -> `CanvasManager` overlays annotations. Annotations are saved via `AnalysisService` with debouncing.
