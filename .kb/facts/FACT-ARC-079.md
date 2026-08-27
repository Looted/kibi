---
id: FACT-ARC-079
title: Exposing Canvas for E2E Tests
status: active
tags: [testing, e2e, canvas, fabric-js]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Fabric.js canvas must be exposed to `window` object for E2E tests to access selection state. Example: `(window as any).fabricCanvas = this._canvas;`. E2E tests need access to verify selection behavior without relying on visual inspection.
