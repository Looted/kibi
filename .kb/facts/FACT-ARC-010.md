---
id: FACT-ARC-010
title: Data flow includes client compression, analysis playback, and debounced persistence
status: active
tags: [architecture, data-flow]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The data flow for video files in the example product follows a pipeline from upload to analysis and playback, with specific optimizations at each stage.

## Flow Overview

1. **Upload**
   - **Capture**: Video selected → `VideoController` captures video from camera/mic
   - **Compress**: `CompressionService` compresses using ffmpeg.wasm
   - **Metadata**: `VideoMetadataExtractor` extracts duration, resolution, frame rate
   - **Upload**: `VideoUploadService` uploads compressed file + metadata via Supabase Storage

2. **Storage**: Stored in Supabase Storage bucket

## 2. **Analysis**

- **Load**: `AnalysisService` loads video from Supabase Storage URL
- **Initialize**: `VideoController` initializes canvas and `CanvasManager`
- **Playback**: `VideoPlayerService` controls video playback with overlays
- **Annotate**: User can add drawings, text, voice notes

3. **Persist**: `ReviewService` saves annotations with debouncing

## Data Flow Characteristics

**Client-Side Compression**: Reduces file sizes before upload, lowers storage costs
**Async Flow**: Non-blocking operations with signals
**Playback Sync**: Video playback syncs with annotations with <100ms latency target

## Persistence

**Analysis Studio**: Video and annotations loaded from storage with canvas overlay
**CanvasManager**: Exposes Fabric.js drawing engine
**DrawingToolManagerService**: Manages tool state

## 3. Playback

**StudentView**: User views their video with synced annotations
