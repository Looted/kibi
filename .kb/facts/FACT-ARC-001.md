---
id: FACT-ARC-001
title: Frontend implemented using Angular 21+ with Standalone Components and Signals
status: active
tags: [architecture, frontend, angular, signals, standalone]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

Frontend uses Angular 21+ (TypeScript) with Standalone Components and Signals for reactive UI and efficient state management.

## Technical Decisions

Angular 21 is used as the frontend framework with modern features including standalone components, signals for state management, and native control flow syntax. Components follow standalone architecture pattern without NgModules for better tree-shaking.

Standalone components (no NgModules) enable independent development and better dependency management. Change detection strategy is set to OnPush for all components to work efficiently with signals.

Signals (signal(), computed(), effect()) provide reactive state management without manual subscription chains. This is a departure from RxJS-based state management patterns in the system.

Native control flow (@if, @for, @switch) replaces ngIf, ngFor, ngSwitch for cleaner and more performant templates.

Service abstraction allows the backend to be swapped without requiring UI code changes. All external data operations (Auth, Storage, Database) are defined as abstract classes/interfaces.

Fabric.js is selected as the drawing library over raw Canvas API. It provides robust object handling for move, resize, and delete operations on drawing annotations.

A client-side compression pipeline using ffmpeg.wasm is planned to reduce server load and storage costs for video processing.

The domain model uses Student/Instructor internally (in code) but maps to Climber/Coach in the user interface for sport-neutral terminology.

Component structure organizes the application into pages (top-level views), reusable components, services, models, and models directories for clear separation of concerns.
