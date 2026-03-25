---
id: FACT-ARC-051
title: Mock External Dependencies Pattern
status: active
tags: [testing, unit-tests, mocking]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

When writing unit tests for services that depend on external APIs, use `useValue` with mock objects to isolate units from libraries.
