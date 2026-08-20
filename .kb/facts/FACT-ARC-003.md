---
id: FACT-ARC-003
title: Backend architecture uses Supabase with PostgreSQL, GoTrue, and Storage
status: active
tags: [architecture, backend, supabase, postgresql, storage]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The backend is built on Supabase with the following stack:

## Database

- **PostgreSQL**: Primary database for relational data storage.

## Backend Services

- **GoTrue**: GoTrue HTTP server provides backend API endpoints.

## Storage

- **Supabase Storage**: Cloud storage for video files (upload and playback).
- **Local Storage**: IndexedDB for local data persistence in the browser.

## Technology Stack

- Database: PostgreSQL
- Backend Framework: GoTrue
- API Server: GoTrue
- Client-side Compression: Planned: ffmpeg.wasm for reducing server load and storage costs

## Architecture Patterns

### Service Abstraction

All external data operations are abstracted behind interfaces:

- `AuthService`: Authentication and session management
- `DataService`: Generic data access layer
- `StorageService`: Abstraction over IndexedDB/Supabase for file operations
- `ReviewService`: Analysis CRUD operations

This enables backend swapping without requiring UI code changes. For example, swapping from local IndexedDB to Supabase Storage would only require changing the `StorageService` implementation, not the UI code.

### Data Flow

Video files flow through the client with compression: Upload → Supabase Storage → Analysis playback.
Annotations are persisted via `ReviewService` with debouncing to prevent race conditions.

### Storage Layer

Two storage options are available:

1. **IndexedDbReviewRepository**: Browser-based, works locally but requires user permission quota
2. **SupabaseDataService**: Cloud-based, provides quotas but requires auth

The `DataService` injects the appropriate storage adapter based on availability and user preference.

### Compression Strategy

A client-side compression pipeline is planned using ffmpeg.wasm:

- Reduces server load (fewer transcoding requests)
- Lowers storage costs for video files
- Improves upload and playback performance

## Service Interface Token Injection

`DATA_SERVICE` and `AUTH_SERVICE` tokens in `app.config.ts` allow services to inject different storage implementations:

- `DATA_SERVICE` token → IndexedDbReviewRepository` (local storage)
- `DATA_SERVICE` token → SupabaseDataService` (cloud storage)
- `AUTH_SERVICE` token → AuthService (for auth state)

This pattern allows clean separation of concerns and enables runtime storage adapter selection.
