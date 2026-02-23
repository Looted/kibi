---
id: TEST-001
title: kibi init creates .kb/ directory structure
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - init
  - unit
links:
  - REQ-003
  - SCEN-002
---

Validates that `kibi init` creates `.kb/config.json`, `.kb/schema/`, and
`.kb/branches/main/` in a temp directory. Asserts all three paths exist and
`config.json` is valid JSON with a `paths` object.
