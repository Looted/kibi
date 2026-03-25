---
id: FACT-ARC-015
title: Component relationships define app structure from root to pages to shared components
status: active
tags: [architecture, components, relationships]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The Align component architecture follows a hierarchical tree structure from root to shared components.

## Root Component

`App` is the standalone root component that:

- Provides routing via `RouterOutlet`
- Contains top-level page components

## Page Layer

Pages (`src/app/pages/`) are route targets:

- Dashboard
- Analysis Studio
- StudentView

Each page is a standalone component with its own route.

## Component Layer

Components (`src/app/components/`) are shared across pages:

- Drawing tools
- Video controls
- Navigation components
- Shared UI elements (buttons, dialogs, etc.)

## Data Flow

Services (`src/app/services/`) and Models (`src/app/models/`) are organized by:

- Data access: `DataService`
- Analysis: `AnalysisService`
- Review: `ReviewService`
- State management: `AuthService`, `SessionService`
- Video: `VideoService`, `CanvasManagerService`, `DrawingToolManagerService`

## Relationships

**App → Pages**: RouterOutlet routes to page components
**Pages → Components**: Shared components are used in pages
**Components → Services**: Components consume services

## Service-Repository Pattern

Each service receives its repository via token injection:

```typescript
export class ExampleService {
  constructor(@Inject(ExampleService) private exampleService: ExampleService) {}
}
```

This pattern enables:

- Easy testing (mock the repository interface)
- Flexible implementations
- Clean separation of concerns

## Benefits

- Type safety through generics
- Compile-time type checking
- Encapsulation via read-only signals
