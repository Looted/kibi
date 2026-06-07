---
id: REQ-cli-status-pre-first-sync
title: CLI status returns machine-readable metadata before first sync
status: open
created_at: 2026-04-17T12:00:00Z
updated_at: 2026-04-17T12:00:00Z
source: documentation/requirements/REQ-cli-status-pre-first-sync.md
tags:
  - cli
  - discovery
  - status
links:
  - type: depends_on
    target: REQ-mcp-search-discovery
  - type: specified_by
    target: SCEN-cli-status-pre-first-sync
  - type: verified_by
    target: TEST-cli-status-pre-first-sync
---

Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed. This enables tools and agents to discover the KB presence and status programmatically in a fresh environment.
