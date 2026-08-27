---
title: Cursor hook treats manifest.json as Kibi readiness
status: passing
tags:
  - cursor
  - canonical-layout
verification_scope: unit
verification_perspective: internal
text_ref: packages/cursor/tests/hook-runner.test.ts
id: TEST-cursor-canonical-manifest
type: test
---
Unit coverage lives in `packages/cursor/tests/hook-runner.test.ts`. Hook fixtures write `.kb/manifest.json` rather than leftover `.kb/config.json`.
