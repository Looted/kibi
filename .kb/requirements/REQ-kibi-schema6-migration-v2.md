---
status: open
priority: must
tags:
  - migration
  - schema-6
  - origin
  - semantic-inventory
  - cli
title: Current schema migration preserves origins and grounding
semantic_text: kibi init must start a new knowledge base at KB schema 7. kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged. kibi migrate must never overwrite an existing origin. kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match. A new or reclassified claim in a re-derived inventory must become unresolved and never modeled. kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning. kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it. kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition. kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate. A kibi migrate run after an applied schema 7 migration must find nothing left to migrate.
semantic_clauses:
  - kibi init must start a new knowledge base at KB schema 7.
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
semantic_source_hash: 6aa8cfd5fcc468186e4925a69b322bb9d2fcf71a9c11e29c8897d900655a64a8
semantic_inventory:
  - claim_key: CLAIM-0485B25C665A333A
    claim_text: kibi init must start a new knowledge base at KB schema 7
    role: normative
    span:
      start: 0
      end: 56
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-9DA50722C4A9B004
    claim_text: kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged
    role: normative
    span:
      start: 58
      end: 209
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-E242177CEDD37A68
    claim_text: kibi migrate must never overwrite an existing origin
    role: normative
    span:
      start: 211
      end: 263
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-DD6A34382C719153
    claim_text: kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match
    role: normative
    span:
      start: 265
      end: 438
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-7F48962B7B024AA1
    claim_text: A new or reclassified claim in a re-derived inventory must become unresolved and never modeled
    role: normative
    span:
      start: 440
      end: 534
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-10603D9513CD6DAA
    claim_text: kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning
    role: normative
    span:
      start: 536
      end: 636
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-6CEBFEF4D015CF56
    claim_text: kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it
    role: normative
    span:
      start: 638
      end: 776
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-3F7333FAB237DA81
    claim_text: kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition
    role: normative
    span:
      start: 778
      end: 907
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-3CE79E9EEB832118
    claim_text: kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate
    role: normative
    span:
      start: 909
      end: 1069
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
  - claim_key: CLAIM-81CA6DAF832B824E
    claim_text: A kibi migrate run after an applied schema 7 migration must find nothing left to migrate
    role: normative
    span:
      start: 1071
      end: 1159
    status: modeled
    reason: Grounded by reviewed logical_requirement_rule facts; unchanged migration clauses retain their original grounding.
logic_claims:
  - CLAIM-0485B25C665A333A
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
kibi init must start a new knowledge base at KB schema 7. kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged. kibi migrate must never overwrite an existing origin. kibi migrate must re-derive a drifted semantic inventory with the current advisor, keeping the status and grounding of every claim whose claim key and claim text still match. A new or reclassified claim in a re-derived inventory must become unresolved and never modeled. kibi migrate must refuse to write a re-derived inventory when the requirement changed after planning. kibi migrate must list an inventory that cannot be re-derived safely as a review action with the exact kibi model command that resolves it. kibi migrate must list an exception that exempts a requirement without approved_by as a review action that requires a disposition. kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate. A kibi migrate run after an applied schema 7 migration must find nothing left to migrate.
