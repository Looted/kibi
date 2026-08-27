---
id: FACT-ARC-004
title: State management combines RxJS and Angular Signals for local state
status: active
tags: [architecture, state, rxjs, signals]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The application uses a hybrid approach to state management, combining RxJS patterns with Angular Signals for local reactive state.

## Architecture

### RxJS Legacy

Historical state management in the system uses RxJS with:

- `BehaviorSubject` for state streams
- `Observable` for async operations
- Subscription-based updates

### Angular Signals

New state management uses Angular Signals:

- `signal()` for local state
- `computed()` for derived state
- `effect()` for side effects
- No manual subscription cleanup needed

### Migration Strategy

A gradual migration from RxJS to Signals:

1. New features use Signals exclusively
2. Existing RxJS patterns remain for complex async scenarios
3. Services still expose Observables where needed for external integrations

### Signal Migration Patterns (from memory-bank/systemPatterns.md)

**Prohibited Patterns**

- Never use `BehaviorSubject` for new state - Use `signal()`
- Never use `ChangeDetectorRef.detectChanges()` - Signals with OnPush handle reactivity automatically
- Never use `NgZone.run()` - Signal updates don't require zone wrapping
- Never use `markForCheck()` - Use signals for reactive updates
- Never mix BehaviorSubjects and signals in same service - Choose one pattern per service

### Service Signal Pattern

Services expose read-only signals via getters:

```typescript
@Injectable({ providedIn: "root" })
export class ExampleService {
  private readonly _state = signal<State>(initialState);

  // Public read-only signal
  get state(): Signal<State> {
    return this._state.asReadonly();
  }

  // Public setter for controlled updates
  setState(newState: State): void {
    this._state.set(newState);
  }

  // Computed derived state
  readonly derivedState = computed(() => transform(this._state()));
}
```

### State Management Services

**Auth Service**: Manages authentication state using Signals
**Session Service**: Manages user session and permissions
**Video State Service**: Manages video state (currently playing, etc.)

### Component State Pattern

Modals and menus must reset internal state when closed:

```typescript
effect(() => {
  if (!this.isOpen()) {
    this.internalState.set(""); // Reset when modal closes
  }
});
```

This pattern prevents stale state persisting when component instances are reused (especially in @for loops).
