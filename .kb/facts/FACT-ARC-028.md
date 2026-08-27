---
id: FACT-ARC-028
title: Video Upload Data Flow
status: active
tags: [data-flow, upload, compression]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Video upload flow: Video selected -> Compressed (Client) via `ffmpeg.wasm` -> Uploaded via `VideoUploadService` to Supabase Storage.
