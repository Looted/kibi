---
id: FACT-ARC-012
title: Service injection uses inject() function for dependency injection
status: active
tags: [architecture, service, dependency-injection]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

Angular's dependency injection system uses the `inject()` function to provide flexible, testable, and type-safe dependency management.

## Pattern

### Dependency Declaration

```typescript
@Injectable({ providedIn: "root" })
export class ExampleService {
  constructor(
    @Inject(ExternalService) private externalService: ExternalService,
  ) {}
}
```

### Injection Token Pattern

The `app.config.ts` file defines injection tokens for dependencies:

```typescript
const DATA_SERVICE = new InjectionToken<StorageRepository>();
const AUTH_SERVICE = new InjectionToken<AuthService>();
```

Services inject tokens to receive their implementation:

```typescript
constructor(
  @Inject(DATA_SERVICE) private dataService: DataService,
  @Inject(AUTH_SERVICE) private authService: AuthService
) {}
```

This pattern provides:

1. **Clean Separation**: Each service manages its own dependencies independently
2. **Easy Mocking**: Tokens can be easily mocked with useValue for unit tests
3. **Flexible**: Different implementations can be swapped by changing only the injected token

## Token-Based Interface Definition

The injection tokens use a generic `InjectionToken<T>` interface:

```typescript
export interface InjectionToken<T> {
  get(): T;
}
```

Services implement their interface and provide themselves as the token value:

```typescript
export class StorageRepository implements InjectionToken<StorageRepository> {
  get(): StorageRepository {
    return this;
  }
}
```

## Benefits

**Type Safety**: Generics provide compile-time type safety

- **Encapsulation**: Tokens are opaque strings; callers don't depend on their value
- **Testability**: Tokens can be replaced with mock implementations easily

## Usage Example: Selecting Storage Adapter

The `DataService` uses the injection token to select the appropriate storage implementation:

```typescript
export class DataService {
  private readonly _storageRepository = inject(
    InjectionToken<StorageRepository>,
  );

  get storage(): Storage {
    return this._storageRepository;
  }
}
```

This enables:

- Runtime adapter switching (e.g., local vs cloud storage)
- Clean separation of concerns
- Easy mocking for unit tests
