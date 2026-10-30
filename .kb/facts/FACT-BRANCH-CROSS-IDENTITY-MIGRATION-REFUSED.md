---
title: No cross-identity branch migration is allowed
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: allowed_cross_identity_migrations
operator: eq
value_type: int
value_int: 0
canonical_key: kibi.kb.branch:allowed_cross_identity_migrations:eq:0
text_ref: .kb/requirements/REQ-branch-store-recovery-v3.md
tags:
  - strict-modeling
  - branching
  - migration
  - exact-identity
claim_key: CLAIM-64ED01687C9C549E
claim_text: Every cross-identity pair, including main to master, must be refused
links:
  - type: relates_to
    target: FACT-BRANCH-CROSS-IDENTITY-MIGRATION-LEGACY
id: FACT-BRANCH-CROSS-IDENTITY-MIGRATION-REFUSED
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Every cross-identity pair, including main to master, must be refused.

