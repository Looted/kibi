---
id: TEST-cli-sync-discovery-readme-ignore
title: CLI sync discovery ignores README markdown under entity directories
type: test
status: active
created_at: 2026-06-26T13:30:00Z
updated_at: 2026-06-26T13:30:00Z
tags:
  - cli
  - sync
  - discovery
  - regression
verification_scope: unit
verification_perspective: internal
links:
  - type: validates
    target: SCEN-001
  - type: validates
    target: REQ-core-extractors
---

The sync discovery unit tests verify that `discoverSourceFiles` excludes
`README.md` files under configured entity directories while still returning
actual entity markdown files.
