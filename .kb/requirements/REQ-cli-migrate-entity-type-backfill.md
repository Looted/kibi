---
title: kibi migrate states the folder-implied type on entity files without one
status: open
required_evidence: tested
priority: must
tags:
  - cli
  - migration
  - upsert
semantic_text: kibi migrate must add the folder-implied type to the front matter of every authored entity file that has no type field, at any schema version. That edit must leave every other line of the file unchanged.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c9ab171bddbce10553e4e6cc389b7030a1ab5e650031d19622d7f46ebea88b06
semantic_inventory:
  - claim_key: CLAIM-7D2B678A106147C3
    claim_text: kibi migrate must add the folder-implied type to the front matter of every authored entity file that has no type field, at any schema version
    role: normative
    status: modeled
    span:
      start: 0
      end: 141
  - claim_key: CLAIM-D3B3F347BA3A589A
    claim_text: That edit must leave every other line of the file unchanged
    role: normative
    status: modeled
    span:
      start: 143
      end: 202
logic_claims:
  - CLAIM-7D2B678A106147C3
  - CLAIM-D3B3F347BA3A589A
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:48.606Z'
id: REQ-cli-migrate-entity-type-backfill
type: req
---
kibi migrate must add the folder-implied type to the front matter of every authored entity file that has no type field, at any schema version. That edit must leave every other line of the file unchanged.

## Context

Entity files written before Kibi stated `type` in front matter take their type from the folder (`.kb/requirements/` reads as `req`). `kibi migrate --yes` moved and rewrote such files (origin, pinned `semantic_text`, status mapping) but left the type implicit, and every Kibi write states it. So the first `kb_upsert` after a migration, even a status-only change, appended `type: req` to the front matter: an unrelated line in a user's change. Seen in a test project during a real legacy-KB migration. Reported by the project owner.

Migrate now states the folder-implied type as the last front matter key of each authored entity file that lacks one, so the line lands in the migration commit. KBs that were already migrated without it get the same edit from the next `kibi migrate` (an automatic `entity_type_backfill` action) at any schema version; no schema bump is needed because the files are valid without the field and sync already reads the folder-implied type.

## Source

> The first Kibi write after migrate adds `type: req` at the end of a legacy entity's front matter, an unrelated diff line. Migrate should add the folder-implied `type` itself, and a status-only upsert after migrate should change only the status line.
