---
title: Legacy cross-identity branch migration exception
status: superseded
text_ref: documentation/requirements/REQ-branch-store-recovery-v2.md
tags:
  - strict-modeling
  - branching
  - migration
  - history
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: cross_identity_migration_allowed
operator: eq
value_type: bool
value_bool: true
canonical_key: kibi.kb.branch:cross_identity_migration_allowed:eq:true
claim_key: CLAIM-449AE98BAC3BD69C
claim_text: The historical master to legacy main store migration is a single compatibility workflow and must reject arbitrary cross-branch moves
id: FACT-BRANCH-CROSS-IDENTITY-MIGRATION-LEGACY
type: fact
---
The historical master to legacy main store migration is a single compatibility workflow and must reject arbitrary cross-branch moves.

