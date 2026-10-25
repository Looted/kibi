---
title: A requirement that once failed to compile keeps its legacy treatment while its prose is unchanged
status: open
required_evidence: tested
priority: must
tags:
  - sync
  - upsert
semantic_text: Kibi sync must accept a requirement source without a complete proposition inventory after an extraction failure when the source's prose equals the prose of its last successful compilation. Kibi kb_upsert must accept a requirement write without a complete proposition inventory to a file the store lacks only when the next kibi sync accepts that file.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b11a5088b08b6c3603e9f37835c62274a709b7ba829feebfe408511cbf2d6c22
semantic_inventory:
  - claim_key: CLAIM-45FE0319308248D0
    claim_text: Kibi sync must accept a requirement source without a complete proposition inventory after an extraction failure when the source's prose equals the prose of its last successful compilation
    role: normative
    status: modeled
    span:
      start: 0
      end: 187
  - claim_key: CLAIM-F345624530510122
    claim_text: Kibi kb_upsert must accept a requirement write without a complete proposition inventory to a file the store lacks only when the next kibi sync accepts that file
    role: normative
    status: modeled
    span:
      start: 189
      end: 349
logic_claims:
  - CLAIM-45FE0319308248D0
  - CLAIM-F345624530510122
origin:
  kind: agent
  recorded_at: '2026-10-14T17:39:55.419Z'
id: REQ-kibi-uncompiled-source-semantic-baseline
type: req
---
Kibi sync must accept a requirement source without a complete proposition inventory after an extraction failure when the source's prose equals the prose of its last successful compilation. Kibi kb_upsert must accept a requirement write without a complete proposition inventory to a file the store lacks only when the next kibi sync accepts that file.

Sync records, with each source it cannot extract, the semantic source hash the source last compiled with. A legacy source that failed the store's first compilation keeps the legacy baseline; a source that compiled before keeps it while its prose hashes the same. An upsert of a requirement the store does not hold applies that same rule to the file, so a write it accepts compiles at the next sync and a write sync would accept is not refused.

## Context

In a test project, a migrated requirement without an inventory synced cleanly. After its status was edited to a value sync cannot compile and back with `git checkout`, `kibi sync` refused the exact committed file and demanded a complete inventory, because the failed sync dropped its cache entry and the next compile treated it as new authoring. A status-only `kb_upsert` on the same file was accepted and then failed the next sync, so the write guard and sync disagreed. Reported by the project owner.

## Source

> A requirement whose text (semantic source hash) is unchanged keeps its grandfathered status after a transient extraction failure. Restoring the file, or fixing only the status, syncs cleanly.
>
> Write guard and sync apply the same rule. A write the guard accepts never fails the next sync, and the reverse.
