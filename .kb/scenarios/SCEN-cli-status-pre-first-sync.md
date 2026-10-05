---
id: SCEN-cli-status-pre-first-sync
title: Fresh repository returns status metadata immediately after kibi init
status: active
created_at: 2026-04-17T12:00:00Z
updated_at: 2026-04-17T12:00:00Z
tags:
  - cli
  - init
  - status
links:
  - type: verified_by
    target: TEST-cli-status-pre-first-sync
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

**Given** a repository that has been initialized with `kibi init`
**And** no `kibi sync` has been performed yet
**When** the consumer runs `kibi status --format json`
**Then** the command should exit with code 0
**And** return a JSON object containing valid repository and branch metadata
**And** indicate that the knowledge base is currently empty or not yet synced.
