---
id: REQ-core-atomic-upsert-persistence
title: Atomic upsert persistence and bounded audit-lock failures
status: open
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: packages/core/src/kb.pl
priority: must
tags:
  - core
  - prolog
  - persistence
  - audit
  - concurrency
semantic_text: |-
  Each `kb_upsert` mutation must execute one bounded Prolog commit that holds the branch write lock while it validates the attached snapshot, applies the entity and relationships, checks contradictions, records entity and relationship audit rows, synchronizes the audit journal, and saves one RDF snapshot. A failed or timed-out pre-save stage must not publish the entity or relationships as durable state.

  The persistent audit journal must release its write lock after every append. Before RDF mutation, a commit must probe an existing journal without waiting and return an actionable stale-runtime/lock error when an older Kibi process still owns the journal lock. Concurrent current runtimes serialize through the branch lock, while a stale attached snapshot fails before mutation.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0d5e2b32e10fdf9ebdf59787a6806ba09b5514ad721793ea375c3e47fd2174d4
logic_claims:
  - CLAIM-64926C47C2848B43
  - CLAIM-8D6381B25F6A5C44
  - CLAIM-B08EED7571042B9C
  - CLAIM-6DD1D3C7DBACF786
  - CLAIM-B03495A1D1AC6DBE
semantic_inventory:
  - claim_key: CLAIM-64926C47C2848B43
    claim_text: Each `kb_upsert` mutation must execute one bounded Prolog commit that holds the branch write lock while it validates the attached snapshot, applies the entity and relationships, checks contradictions, records entity and relationship audit rows, synchronizes the audit journal, and saves one RDF snapshot
    role: normative
    status: modeled
    span: {start: 0, end: 303}
  - claim_key: CLAIM-8D6381B25F6A5C44
    claim_text: A failed or timed-out pre-save stage must not publish the entity or relationships as durable state
    role: normative
    status: modeled
    span: {start: 305, end: 403}
  - claim_key: CLAIM-B08EED7571042B9C
    claim_text: The persistent audit journal must release its write lock after every append
    role: normative
    status: modeled
    span: {start: 406, end: 481}
  - claim_key: CLAIM-6DD1D3C7DBACF786
    claim_text: Before RDF mutation, a commit must probe an existing journal without waiting and return an actionable stale-runtime/lock error when an older Kibi process still owns the journal lock
    role: normative
    status: modeled
    span: {start: 483, end: 664}
  - claim_key: CLAIM-B03495A1D1AC6DBE
    claim_text: Concurrent current runtimes serialize through the branch lock, while a stale attached snapshot fails before mutation
    role: normative
    status: modeled
    span: {start: 666, end: 782}
links:
  - type: specified_by
    target: SCEN-core-atomic-upsert-persistence
  - type: verified_by
    target: TEST-core-atomic-upsert-persistence
  - type: requires_predicate
    target: FACT-ATOMIC-UPSERT-COMMIT
  - type: requires_predicate
    target: FACT-ATOMIC-UPSERT-NO-PARTIAL
  - type: requires_predicate
    target: FACT-AUDIT-APPEND-CLOSE
  - type: requires_predicate
    target: FACT-AUDIT-LOCK-PROBE
  - type: requires_predicate
    target: FACT-ATOMIC-UPSERT-SNAPSHOT
  - type: relates_to
    target: REQ-core-persistence
  - type: relates_to
    target: REQ-core-audit-logging
  - type: relates_to
    target: REQ-core-prolog-process-management
  - type: relates_to
    target: REQ-mcp-tool-upsert
---

Each `kb_upsert` mutation must execute one bounded Prolog commit that holds the branch write lock while it validates the attached snapshot, applies the entity and relationships, checks contradictions, records entity and relationship audit rows, synchronizes the audit journal, and saves one RDF snapshot. A failed or timed-out pre-save stage must not publish the entity or relationships as durable state.

The persistent audit journal must release its write lock after every append. Before RDF mutation, a commit must probe an existing journal without waiting and return an actionable stale-runtime/lock error when an older Kibi process still owns the journal lock. Concurrent current runtimes serialize through the branch lock, while a stale attached snapshot fails before mutation.
