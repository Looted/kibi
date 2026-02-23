---
id: TEST-002
title: kibi sync imports entities from fixture Markdown files
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - sync
  - unit
links:
  - REQ-007
  - SCEN-007
---

Runs `kibi sync` against `test/fixtures/` and then `kibi query req --format json`.
Asserts the returned array contains entities with correct `id`, `title`, and `status`
values sourced from the fixture files.
