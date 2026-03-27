---
id: FACT-ARC-011
title: Design patterns include standalone components, signal-based reactivity, and component composition
status: active
tags: [architecture, design, patterns]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The Align project follows well-established design patterns for Angular 21+ applications.

## Component Patterns

### Standalone Components

All components are standalone (no NgModules) with `changeDetection: ChangeDetectionStrategy.OnPush` for optimal reactivity:

```typescript
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

### Signal-Based Reactivity

State is managed using Angular Signals:

- `signal()` for local state
- `computed()` for derived state
- `effect()` for side effects
- No manual subscription cleanup needed

### Component Reuse

When using `input()` signals in `@for` loops, Angular may reuse component instances. Internal state must be reset when input changes:

```typescript
effect(() => {
  if (!this.isOpen()) {
    this.internalState.set("");
  }
});
```

### Input/Output Functions

Use `input()` and `output()` instead of decorators:

```typescript
readonly input = input<string>('');
readonly output = output<string>('');
```

### Computed Properties

Use `computed()` for all derived state:

```typescript
readonly derived = computed(() => transform(this.input()));
```

### Design Patterns

**Smart/Dumb Pattern**: Pages are "smart" (fetch data), components are "dumb" (receive inputs, emit outputs):

- Separation of data fetching from presentation
- Enables independent development and testing

**Service Injection**: Use `inject()` function:

```typescript
constructor(
  @Inject(ExampleService) private exampleService: ExampleService
) {}
```

## Benefits

- Clear component boundaries
- Easy dependency mocking for tests
- Better encapsulation
- Clean test environment

## Anti-Patterns

Never use:

- `@Input()` / `@Output()` decorators
- `ngModel` for forms
- `BehaviorSubject` for state
- `Subject` for async operations
- `ChangeDetectorRef.detectChanges()` - Signals with OnPush handle this automatically
- `NgZone.run()` - Signal updates don't require zone
- `markForCheck()` - Use signals for reactive updates
- Manual subscriptions - Use signals instead
- `mutate()` - Use `update()` or `set()` instead

### Template Patterns

Use native control flow:

- `@if`, `@for`, `@switch` instead of ngIf, ngFor, ngSwitch
- Avoid `ngClass`/`ngStyle` - use class and style bindings
- Avoid `async` pipe - Use signals directly in templates
- Handle complex event casting in component methods

## Example

```html
@if (isOpen()) {
<app-modal [isOpen]="true" />
}
```
