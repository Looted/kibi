---
status: open
required_evidence: tested
priority: must
tags:
  - migration
  - schema-6
  - origin
  - semantic-inventory
  - cli
  - review:context-missing
title: Current schema migration preserves origins and grounding
semantic_text: kibi init must start a new knowledge base at the latest KB schema version. kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged. kibi migrate must never overwrite an existing origin. kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match. A new or reclassified claim in a re-derived inventory must become unresolved and never modeled. kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning. kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it. kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition. kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate. A kibi migrate run after an applied schema 7 migration must find nothing left to migrate.
semantic_clauses:
  - kibi init must start a new knowledge base at the latest KB schema version.
  - kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged.
  - kibi migrate must never overwrite an existing origin.
  - kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match.
  - A new or reclassified claim in a re-derived inventory must become unresolved and never modeled.
  - kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning.
  - kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it.
  - kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition.
  - kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate.
  - A kibi migrate run after an applied schema 7 migration must find nothing left to migrate.
rationale: Schema 7 adds typed polarity migration while preserving the previous origin and semantic inventory guarantees.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f175f7af938f7a62fe324668beb3204feb40c508719f7cf44119c73b6768bf2e
semantic_inventory:
  - claim_key: CLAIM-4DB870D9CF5519BC
    claim_text: kibi init must start a new knowledge base at the latest KB schema version
    role: normative
    status: modeled
    span:
      start: 0
      end: 73
  - claim_key: CLAIM-9DA50722C4A9B004
    claim_text: kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged
    role: normative
    status: modeled
    span:
      start: 75
      end: 226
  - claim_key: CLAIM-E242177CEDD37A68
    claim_text: kibi migrate must never overwrite an existing origin
    role: normative
    status: modeled
    span:
      start: 228
      end: 280
  - claim_key: CLAIM-DD6A34382C719153
    claim_text: kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match
    role: normative
    status: modeled
    span:
      start: 282
      end: 455
  - claim_key: CLAIM-7F48962B7B024AA1
    claim_text: A new or reclassified claim in a re-derived inventory must become unresolved and never modeled
    role: normative
    status: modeled
    span:
      start: 457
      end: 551
  - claim_key: CLAIM-10603D9513CD6DAA
    claim_text: kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning
    role: normative
    status: modeled
    span:
      start: 553
      end: 653
  - claim_key: CLAIM-6CEBFEF4D015CF56
    claim_text: kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it
    role: normative
    status: modeled
    span:
      start: 655
      end: 793
  - claim_key: CLAIM-3F7333FAB237DA81
    claim_text: kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition
    role: normative
    status: modeled
    span:
      start: 795
      end: 924
  - claim_key: CLAIM-3CE79E9EEB832118
    claim_text: kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate
    role: normative
    status: modeled
    span:
      start: 926
      end: 1086
  - claim_key: CLAIM-81CA6DAF832B824E
    claim_text: A kibi migrate run after an applied schema 7 migration must find nothing left to migrate
    role: normative
    status: modeled
    span:
      start: 1088
      end: 1176
logic_claims:
  - CLAIM-4DB870D9CF5519BC
  - CLAIM-9DA50722C4A9B004
  - CLAIM-E242177CEDD37A68
  - CLAIM-DD6A34382C719153
  - CLAIM-7F48962B7B024AA1
  - CLAIM-10603D9513CD6DAA
  - CLAIM-6CEBFEF4D015CF56
  - CLAIM-3F7333FAB237DA81
  - CLAIM-3CE79E9EEB832118
  - CLAIM-81CA6DAF832B824E
origin:
  kind: agent
  recorded_at: '2026-10-04T17:32:26.798Z'
id: REQ-kibi-schema6-migration-v2
type: req
---
kibi init must start a new knowledge base at the latest KB schema version. kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged. kibi migrate must never overwrite an existing origin. kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match. A new or reclassified claim in a re-derived inventory must become unresolved and never modeled. kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning. kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it. kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition. kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate. A kibi migrate run after an applied schema 7 migration must find nothing left to migrate.

## Context

This requirement covers the schema 6 migration, which gave every authored entity an origin, and the schema 7 migration, which re-derives drifted semantic inventories.

## Why this changed

The init claim named schema 7, the latest schema when this requirement was written. Later schemas (up to 12) made it false while the code stayed right, so on 2026-10-27 it was restated as the latest schema version.
