---
id: FACT-ARC-020
title: Fabric.js Canvas Abstraction
status: active
tags: [architecture, canvas, fabric-js]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-03-25T00:00:00Z
fact_kind: meta
---

Drawing functionality uses Fabric.js instead of raw Canvas API. Fabric.js provides robust object handling for annotations including move, resize, and delete operations. This abstraction layer sits above the native HTML5 video element.
