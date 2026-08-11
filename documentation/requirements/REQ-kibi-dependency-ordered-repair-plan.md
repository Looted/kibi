---
id: REQ-kibi-dependency-ordered-repair-plan
title: Requirement proof gaps produce a safe dependency-ordered repair plan
status: open
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-dependency-ordered-repair-plan.md
priority: must
tags: [requirements, proof, repair, migration, planning, parity]
logic_claims:
  - CLAIM-64B7C0764B97AD46
  - CLAIM-98FD5384CF7480CE
  - CLAIM-17D47FE789272899
  - CLAIM-607ED4AD800C206F
  - CLAIM-CCE119E4B7EFD7D0
  - CLAIM-27B1FA17C8CBAC13
  - CLAIM-EF6932ED52025677
  - CLAIM-1599B7B65FC5C39A
semantic_clauses:
  - Requirement coverage must emit a deterministic read-only repair plan for every returned requirement with proof gaps
  - The planner must group same-phase gaps into one small batch per requirement and order batches from source and semantic inventory through logical endpoints, manifests, contradiction resolution, scenarios, tests, receipts, symbols, and coordinates
  - Only the earliest unresolved batch for each requirement may be ready
  - every downstream batch must name its dependencies
  - Every batch must remain non-auto-applicable and require query-before-mutation, endpoint-before-relationship creation, validation before writes, sequential upserts, and coverage rechecking
  - The plan identifier must remain stable for the same code snapshot, filters, proof evidence, and gaps while ignoring volatile check times and receipt ages
  - Pagination that omits actionable requirements must produce a partial plan with the excluded count
  - Non-requirement coverage must not emit a requirement repair plan
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2ed496c639942cc2f0e12d6313eb868d29a98b991ebe3e1f3f9413941524d622
semantic_inventory:
  - claim_key: CLAIM-64B7C0764B97AD46
    claim_text: Requirement coverage must emit a deterministic read-only repair plan for every returned requirement with proof gaps
    role: normative
    status: modeled
    span: {start: 0, end: 115}
  - claim_key: CLAIM-98FD5384CF7480CE
    claim_text: The planner must group same-phase gaps into one small batch per requirement and order batches from source and semantic inventory through logical endpoints, manifests, contradiction resolution, scenarios, tests, receipts, symbols, and coordinates
    role: normative
    status: modeled
    span: {start: 117, end: 362}
  - claim_key: CLAIM-17D47FE789272899
    claim_text: Only the earliest unresolved batch for each requirement may be ready
    role: normative
    status: modeled
    span: {start: 364, end: 432}
  - claim_key: CLAIM-607ED4AD800C206F
    claim_text: every downstream batch must name its dependencies
    role: normative
    status: modeled
    span: {start: 438, end: 487}
  - claim_key: CLAIM-CCE119E4B7EFD7D0
    claim_text: Every batch must remain non-auto-applicable and require query-before-mutation, endpoint-before-relationship creation, validation before writes, sequential upserts, and coverage rechecking
    role: normative
    status: modeled
    span: {start: 489, end: 676}
  - claim_key: CLAIM-27B1FA17C8CBAC13
    claim_text: The plan identifier must remain stable for the same code snapshot, filters, proof evidence, and gaps while ignoring volatile check times and receipt ages
    role: normative
    status: modeled
    span: {start: 678, end: 831}
  - claim_key: CLAIM-EF6932ED52025677
    claim_text: Pagination that omits actionable requirements must produce a partial plan with the excluded count
    role: normative
    status: modeled
    span: {start: 833, end: 930}
  - claim_key: CLAIM-1599B7B65FC5C39A
    claim_text: Non-requirement coverage must not emit a requirement repair plan
    role: normative
    status: modeled
    span: {start: 932, end: 996}
links:
  - type: depends_on
    target: REQ-kibi-conservative-requirement-proof
  - type: depends_on
    target: REQ-kibi-proposition-complete-ingestion
  - type: specified_by
    target: SCEN-kibi-dependency-ordered-repair-plan
  - type: requires_predicate
    target: FACT-REPAIR-PLAN-READ-ONLY
  - type: requires_predicate
    target: FACT-REPAIR-PLAN-DEPENDENCY-ORDER
  - type: requires_predicate
    target: FACT-REPAIR-PLAN-EARLIEST-READY
  - type: requires_predicate
    target: FACT-REPAIR-PLAN-EXPLICIT-DEPENDENCIES
  - type: requires_predicate
    target: FACT-REPAIR-PLAN-NON-AUTO
  - type: requires_predicate
    target: FACT-REPAIR-PLAN-STABLE-ID
  - type: requires_predicate
    target: FACT-REPAIR-PLAN-PAGINATION
  - type: requires_predicate
    target: FACT-REPAIR-PLAN-REQ-ONLY
---

Requirement coverage must emit a deterministic read-only repair plan for every returned requirement with proof gaps. The planner must group same-phase gaps into one small batch per requirement and order batches from source and semantic inventory through logical endpoints, manifests, contradiction resolution, scenarios, tests, receipts, symbols, and coordinates. Only the earliest unresolved batch for each requirement may be ready, and every downstream batch must name its dependencies. Every batch must remain non-auto-applicable and require query-before-mutation, endpoint-before-relationship creation, validation before writes, sequential upserts, and coverage rechecking. The plan identifier must remain stable for the same code snapshot, filters, proof evidence, and gaps while ignoring volatile check times and receipt ages. Pagination that omits actionable requirements must produce a partial plan with the excluded count. Non-requirement coverage must not emit a requirement repair plan.
