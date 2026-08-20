---
id: SCEN-cli-status-pre-first-sync
title: Fresh repository returns status metadata immediately after kibi init
status: active
created_at: 2026-04-17T12:00:00Z
updated_at: 2026-04-17T12:00:00Z
source: documentation/scenarios/SCEN-cli-status-pre-first-sync.md
tags:
  - cli
  - init
  - status
links:
  - type: verified_by
    target: TEST-cli-status-pre-first-sync
---

**Given** a repository that has been initialized with `kibi init`
**And** no `kibi sync` has been performed yet
**When** the consumer runs `kibi status --format json`
**Then** the command should exit with code 0
**And** return a JSON object containing valid repository and branch metadata
**And** indicate that the knowledge base is currently empty or not yet synced.
