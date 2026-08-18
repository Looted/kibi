---
id: FACT-ARC-005
title: Fabric.js selected for drawing over raw Canvas API for robust object handling
status: active
tags: [architecture, drawing, fabric, canvas]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

Fabric.js is used as the drawing library for the Canvas Manager Service to provide robust annotation functionality.

## Rationale

Fabric.js was chosen over raw Canvas API for several reasons:

- **Object-Oriented API**: Fabric.js provides object abstraction over canvas elements
- **Robust State Management**: Automatically handles object lifecycle (creation, modification, selection)
- **Comprehensive Tools**: Includes drawing tools (pen, pencil, line, arrow, shapes), text
- **Event System**: Handles complex events (mouse, touch, keyboard, custom events)

This abstracts away the complexity of manual Canvas API manipulation and enables a more feature-rich drawing experience.

## Implementation

The `CanvasManagerService` uses Fabric.js as the engine for:

- Creating and managing Fabric objects (draw paths, shapes, text, etc.)
- Handling object selection and manipulation (move, resize, rotate, delete)
- Managing canvas rendering and state
- Emitting events for tool state changes

## Drawing Tools

The following drawing tools are available in the Analysis Studio:

- **Pencil Tool**: Freehand drawing with eraser functionality
- **Arrow Tool**: Straight lines and arrowheads
- **Circle Tool**: Circular shapes and areas for highlighting
- **Line Tool**: Multi-segment lines for guides and measurements
- **Text Tool**: Add text annotations anywhere on the canvas
- **Select Tool**: Select, multi-select, and delete objects

Each tool exposes specific functionality and emits events that other components can listen to.

## Fabric.js Integration

Fabric.js is imported via:

```typescript
import { fabric } from "fabric";
```

The `fabric` global provides access to:

- Canvas rendering engine
- Image handling
- Pattern utilities
- Event system

The library is loaded as a standalone script bundle and included in the project assets.

## Object Model

Fabric objects represent canvas elements:

- **Fabric.Object**: Base class for all canvas elements
- **Fabric.Path**: For drawing paths
- **Fabric.Line**: For lines
- **Fabric.Circle**: For circular shapes
- **Fabric.Textbox**: For text annotations
- **Fabric.Image**: For images
- **Fabric.ActiveSelection**: For current selection

## State Management

The `CanvasManagerService` manages:

- Current selection state (single object vs multi-select)
- Tool activation state (which tool is active)
- Object lifecycle (create, modify, delete)
- Rendering state (needsRender, renderCount, renderLoop)

Events are emitted to notify components of state changes.
