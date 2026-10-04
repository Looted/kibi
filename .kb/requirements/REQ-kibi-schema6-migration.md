---
title: kibi migrate upgrades a KB to schema 6 with origin backfill and grounding-preserving inventory re-derivation
status: open
priority: must
tags:
  - migration
  - schema-6
  - origin
  - semantic-inventory
  - cli
semantic_text: kibi init must start a new knowledge base at KB schema 6. kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged. kibi migrate must never overwrite an existing origin. kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match. A new or reclassified claim in a re-derived inventory must become unresolved and never modeled. kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning. kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it. kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition. kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate. A kibi migrate run after an applied schema 6 migration must find nothing left to migrate.
semantic_clauses:
  - kibi init must start a new knowledge base at KB schema 6.
  - kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged.
  - kibi migrate must never overwrite an existing origin.
  - kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match.
  - A new or reclassified claim in a re-derived inventory must become unresolved and never modeled.
  - kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning.
  - kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it.
  - kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition.
  - kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate.
  - A kibi migrate run after an applied schema 6 migration must find nothing left to migrate.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 35b33b1720d0046ae8c648468f717fb9a46cbdf346b3e5ea124d4839738b1882
semantic_inventory:
  - claim_key: CLAIM-6F3AD22E0E2320D1
    claim_text: kibi init must start a new knowledge base at KB schema 6
    role: normative
    span:
      start: 0
      end: 56
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-9DA50722C4A9B004
    claim_text: kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged
    role: normative
    span:
      start: 58
      end: 209
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E242177CEDD37A68
    claim_text: kibi migrate must never overwrite an existing origin
    role: normative
    span:
      start: 211
      end: 263
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-DD6A34382C719153
    claim_text: kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match
    role: normative
    span:
      start: 265
      end: 438
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-7F48962B7B024AA1
    claim_text: A new or reclassified claim in a re-derived inventory must become unresolved and never modeled
    role: normative
    span:
      start: 440
      end: 534
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-10603D9513CD6DAA
    claim_text: kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning
    role: normative
    span:
      start: 536
      end: 636
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-6CEBFEF4D015CF56
    claim_text: kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it
    role: normative
    span:
      start: 638
      end: 776
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-3F7333FAB237DA81
    claim_text: kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition
    role: normative
    span:
      start: 778
      end: 907
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-3CE79E9EEB832118
    claim_text: kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate
    role: normative
    span:
      start: 909
      end: 1069
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-F143C7424AC5DBAF
    claim_text: A kibi migrate run after an applied schema 6 migration must find nothing left to migrate
    role: normative
    span:
      start: 1071
      end: 1159
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-6F3AD22E0E2320D1
  - CLAIM-9DA50722C4A9B004
  - CLAIM-E242177CEDD37A68
  - CLAIM-DD6A34382C719153
  - CLAIM-7F48962B7B024AA1
  - CLAIM-10603D9513CD6DAA
  - CLAIM-6CEBFEF4D015CF56
  - CLAIM-3F7333FAB237DA81
  - CLAIM-3CE79E9EEB832118
  - CLAIM-F143C7424AC5DBAF
origin:
  kind: agent
  recorded_at: '2026-10-04T02:25:19.881Z'
id: REQ-kibi-schema6-migration
type: req
---
kibi init must start a new knowledge base at KB schema 6. kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged. kibi migrate must never overwrite an existing origin. kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match. A new or reclassified claim in a re-derived inventory must become unresolved and never modeled. kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning. kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it. kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition. kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate. A kibi migrate run after an applied schema 6 migration must find nothing left to migrate.

## Rationale

Schema 6 adds an `origin` to every entity, and an upgraded semantic advisor can read existing requirement prose differently, which used to make `kibi sync` fail one requirement at a time (changeset `kb-schema-6`). `kibi migrate` now stamps a migration origin on every authored entity, re-derives drifted inventories without dropping the grounding of claims that still match, leaves anything it cannot decide safely to a person as a review action, and changes nothing when run again.
