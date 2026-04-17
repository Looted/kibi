---
id: TEST-cli-status-pre-first-sync
title: CLI status is valid before first sync in workspace and packed installs
status: active
created_at: 2026-04-17T12:00:00Z
updated_at: 2026-04-17T12:00:00Z
source: documentation/tests/TEST-cli-status-pre-first-sync.md
tags:
  - cli
  - status
  - regression
links:
  - type: validates
    target: SCEN-cli-status-pre-first-sync
---

The test verifies that the `kibi status` command does not fail when executed in a newly initialized repository before any data has been synced.

**Coverage:**
- Verified in `packages/cli/tests/commands/status.test.ts`
- Tests both JSON and human-readable output formats
- Ensures exit code 0 in both workspace development mode and when executed as a packed binary.
