---
id: FACT-ARC-013
title: Smart/Dumb component pattern separates data fetching from presentation
status: active
tags: [architecture, design-patterns]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The Align project uses the Smart/Dumb pattern to separate concerns and enable independent development.

## Pattern Definition

**Smart Components** (Pages)

- Fetch data from services, emit state changes
- **Dumb Components** (receive inputs, emit outputs)

## Benefits

- **Separation of Concerns**: Data fetching is isolated in pages
- Presentation logic is isolated in components
- Testing is simplified (no need to mock entire page)

## Implementation Example

**Page: Dashboard** (Smart)

```typescript
export class DashboardComponent {
  // ...
  private readonly userService = inject(UserService);

  protected readonly currentUser = computed(() =>
    this.userService.getCurrentUser(),
  );
}
```

**Component: DrawingTool** (Dumb)

```typescript
export class DrawingToolComponent {
  // ...
  readonly tool = inject(DrawingToolManagerService);
}
```

## Anti-Patterns

Never mix smart and dumb components - one should delegate to the other

## Service Signal Pattern

Smart components use `computed()` for derived state and expose signals:

```typescript
protected readonly state = signal<State>(initialState);

protected readonly isActive = computed(() => this.state().isActive);
```

Dumb components just receive values and emit events.

This ensures:

- Smart components manage complex state
- Dumb components stay simple and focused
- Data flow is unidirectional and clear
