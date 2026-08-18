---
id: FACT-ARC-014
title: Service-Repository pattern uses interfaces with token-based injection
status: active
tags: [architecture, service, repository-pattern]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

Service repositories use the token-based injection pattern to provide flexible, testable, and cleanly-swappable backend implementations.

## Interface Definition

```typescript
export interface IStorageRepository {
  get(): IStorageRepository;
  save(entity: Entity): Promise<void>;
  delete(id: string): Promise<void>;
  update(id: string, entity: Entity): Promise<Entity>;
  query(filter: QueryOptions<Entity>): Promise<Entity[]>;
}
}
```

## Implementation Example

```typescript
export class IndexedDbReviewRepository implements IStorageRepository {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    super(DB_INDEXED, ['reviews']) {}
  }

  get(): IStorageRepository {
    return this;
  }

  async save(entity: Review): Promise<void> {
    const id = await this.dbPromise.then(db => db.add('reviews', entity));
    return;
  }
  // ...
}
```

## Token Injection

The `app.config.ts` defines tokens:

```typescript
const DATA_SERVICE = new InjectionToken<StorageRepository>();
```

Services inject tokens:

```typescript
constructor(
  @Inject(DATA_SERVICE) private dataService: DataService,
  @Inject(AUTH_SERVICE) private authService: AuthService
) {}
```

## Benefits

**Backend Swapping**: Moving from local to cloud storage only requires changing `DataService` implementation
**Testing**: Each repository can be unit tested independently against its interface

**Runtime Adaptability**: The system can adapt to different environments or storage backends at runtime
