---
id: FACT-ARC-006
title: Service abstraction enables backend swapping without UI code changes
status: active
tags: [architecture, service, abstraction]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

Service abstraction is a key architectural pattern in the example product that enables backend changes without requiring UI code modifications.

## Pattern Overview

All external data operations (Auth, Storage, Database, etc.) are abstracted behind interfaces:

- `AuthService`: Authentication and session management
- `DataService`: Generic data access layer
- `StorageService`: Abstraction over IndexedDB/Supabase for file operations
- `ReviewService`: Analysis CRUD operations

## Interface Definitions

Each service interface defines contract for:

- Methods required for the operation
- Return types for data
- Parameters for external dependencies
- Error handling strategy

## Token-Based Injection

The `DATA_SERVICE` and `AUTH_SERVICE` tokens are defined in `app.config.ts`:

```typescript
const DATA_SERVICE = new InjectionToken<StorageRepository>();
const AUTH_SERVICE = new InjectionToken<AuthService>();
```

Services inject these tokens to receive their storage implementation:

```typescript
constructor(
  @Inject(DATA_SERVICE) private dataService: DataService,
  @Inject(AUTH_SERVICE) private authService: AuthService
) {}
```

This allows:

1. Runtime storage adapter selection (IndexedDB vs Supabase)
2. Clean separation of concerns
3. Different implementations can be swapped by changing the injected token

## Example: Storage Adapter Selection

The `DataService` provides a getter that returns the appropriate repository:

```typescript
get storage(): Storage {
  return this.dataRepository;
}
```

Internally, this checks app state or user preferences to select the appropriate storage implementation.

## Benefits

**Backend Swapping**: Moving from local storage to cloud storage only requires changing the `DataService` implementation - no UI code needs to be touched.
**Clean Separation**: Each storage adapter handles its own persistence logic independently.
**Testing**: Each storage implementation can be unit tested independently of the service interface.

## Service Repository Pattern

The repository pattern uses:

- Interface definition (`IStorageRepository`)
- Implementation class (e.g. `IndexedDbReviewRepository`)
- Token-based injection to select implementation
- Generic `DataService` that returns repository based on token

This is a flexible pattern that supports:

- Runtime adapter switching
- Easy mocking for unit tests
- Migration to new storage backends
