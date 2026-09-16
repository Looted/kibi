---
id: REQ-cli-status-pre-first-sync
title: CLI status returns machine-readable metadata before first sync
status: open
created_at: 2026-04-17T12:00:00.000Z
updated_at: 2026-04-17T12:00:00.000Z
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
semantic_text: Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed. This enables tools and agents to discover the KB presence and status programmatically in a fresh environment.
logic_claims:
  - CLAIM-11181E5550A15678
  - CLAIM-1907A992CB5758E0
semantic_clauses:
  - Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed
  - This enables tools and agents to discover the KB presence and status programmatically in a fresh environment
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d04b790fdc1b0afd2df6299f293d8d150663ee3b00fcb723693a1b5f5a977c2b
semantic_inventory:
  - claim_key: CLAIM-11181E5550A15678
    claim_text: Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed
    role: normative
    status: modeled
    span:
      start: 0
      end: 183
  - claim_key: CLAIM-1907A992CB5758E0
    claim_text: This enables tools and agents to discover the KB presence and status programmatically in a fresh environment
    role: descriptive
    status: modeled
    span:
      start: 185
      end: 293
type: req
---

Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed. This enables tools and agents to discover the KB presence and status programmatically in a fresh environment.
