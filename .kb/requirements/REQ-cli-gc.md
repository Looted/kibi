---
id: REQ-cli-gc
title: Garbage collection and branch store maintenance
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-003
priority: should
tags:
  - cli
  - gc
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-006
semantic_text: The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch.
semantic_clauses:
  - The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b5c8ece540c2b3493ed98fe46df1cb836babfd4ede9fcb97e3592b123133f4b9
logic_claims:
  - CLAIM-F6BDC944EFE3155C
semantic_inventory:
  - claim_key: CLAIM-F6BDC944EFE3155C
    claim_text: The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 105
type: req
origin:
  kind: migration
  ref: 'Maintainer decision, 2026-11-04, approving the KB gold-standard cleanup that moves the why sentence into rationale: "Ok, all approved." Maintainer decision, 2026-11-10, approving the supersession reasons recovered from history in the KB gold-standard review (reasons batch 1): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
rationale: Keeps the .kb/branches/ directory clean and prevents disk bloat from long-deleted features.
---

The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch.

## Rationale
Keeps the .kb/branches/ directory clean and prevents disk bloat from long-deleted features.

## Why this changed
REQ-003 described every CLI command in one requirement, so it could not be traced or tested per command. It was split into one requirement per command, and this one covers kibi gc. Source: commit "docs(req): split app surface requirements", May 13.
