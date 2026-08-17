---
title: Every cross-identity branch migration is refused
status: active
text_ref: documentation/requirements/REQ-branch-store-recovery-v3.md
tags:
  - strict-modeling
  - branching
  - migration
  - exact-identity
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: cross_identity_migration_allowed
operator: eq
value_type: bool
value_bool: false
canonical_key: kibi.kb.branch:cross_identity_migration_allowed:eq:false
claim_key: CLAIM-64ED01687C9C549E
claim_text: Every cross-identity pair, including main to master, must be refused
links:
  - type: relates_to
    target: FACT-BRANCH-CROSS-IDENTITY-MIGRATION-LEGACY
id: FACT-BRANCH-CROSS-IDENTITY-MIGRATION-REFUSED
type: fact
---
Every cross-identity pair, including main to master, must be refused.

