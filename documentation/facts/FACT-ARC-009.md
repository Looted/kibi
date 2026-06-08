---
id: FACT-ARC-009
title: Component structure organized into pages, components, services, and models directories
status: active
tags: [architecture, components, structure]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The example product follows a clear component architecture organized by responsibility and separation of concerns.

## Directory Structure

```
src/app/
├── pages/           # Top-level views (Dashboard, Analysis, StudentView)
├── components/      # Reusable UI elements
├── services/         # Business logic and data access
├── models/          # TypeScript interfaces
```

## Page Layer (`src/app/pages/`)

Top-level views are organized routes that render when accessed:

- `Dashboard`: Landing page and main entry point
- `Analysis Studio`: Video analysis workspace
- `StudentView`: Student's personal view for their videos and feedback

Pages are standalone Angular components with OnPush change detection.

## Component Layer (`src/app/components/`)

Reusable UI elements are organized by function:

- Drawing tools (pen, arrow, line, circle, text)
- Selection tools (select, multi-select, delete)
- Video controls (play, pause, volume, timeline)
- Navigation components
- Shared components (buttons, inputs, dialogs)

Components follow these principles:

- **Single Responsibility**: Each component has a single, well-defined purpose
- **Standalone**: No NgModules, all components are self-contained
- **OnPush**: Change detection strategy set to OnPush for optimal performance
- **Signals**: State managed with signals for reactivity
- **Input/Output**: Uses `input()` and `output()` instead of decorators

## Service Layer (`src/app/services/`)

Services provide business logic and data access:

- `AuthService`: Authentication and session management
- `SessionService`: User session and permissions
- `VideoService`: Video state management
- `CanvasManagerService`: Canvas/Fabric.js drawing engine
- `DrawingToolManagerService`: Drawing tools state management
- `VideoPlayerService`: Video playback engine
- `ReviewService`: Analysis CRUD operations

Services use dependency injection with `inject()` function and expose read-only signals for encapsulation.

## Model Layer (`src/app/models/`)

TypeScript interfaces define the data structures:

- `User`: `id`, `email`, `displayName`, `role`, `createdAt`
- `Video`: `id`, `ownerId`, `url`, `duration`, `createdAt`
- `Analysis`: `id`, `videoId`, `instructorId`, `annotations`, `status`, `metadata`
- `Review`: `id`, `videoBlob`/`videoUrl`, `annotations`, `metadata`

Interfaces enable type safety and clean separation of concerns.
