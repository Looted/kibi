---
title: Bootstrap and modeling write the semantic advisor's proposition roles
status: open
priority: must
tags:
  - bootstrap
  - semantic-advisor
  - semantic-inventory
rationale: Test project onboarding lost conditional claims and obligations naming a referent as invalid_write because bootstrap recorded a modality-only role that the write-time advisor check rejected.
semantic_text: Bootstrap requirement candidates must take each semantic inventory role from the semantic advisor. The semantic advisor must classify an obligation with a definition verb inside a relative clause as normative. Proposition-complete ingestion must keep accepting stored inventories that recorded the earlier definition role.
semantic_clauses:
  - Bootstrap requirement candidates must take each semantic inventory role from the semantic advisor.
  - The semantic advisor must classify an obligation with a definition verb inside a relative clause as normative.
  - Proposition-complete ingestion must keep accepting stored inventories that recorded the earlier definition role.
logic_claims:
  - CLAIM-A8D0102FA831B456
  - CLAIM-29D225EB5CC910B9
  - CLAIM-12C32D7A69826609
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: test project onboarding round 3 (advisor roles, relationship upserts, review observations)'
  recorded_at: '2026-10-06T20:43:48.691Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 964c842427c3651c670c59112d37e5918a42169538811e436a949d32667888fc
semantic_inventory:
  - claim_key: CLAIM-A8D0102FA831B456
    claim_text: Bootstrap requirement candidates must take each semantic inventory role from the semantic advisor
    role: normative
    span:
      start: 0
      end: 97
    status: modeled
  - claim_key: CLAIM-29D225EB5CC910B9
    claim_text: The semantic advisor must classify an obligation with a definition verb inside a relative clause as normative
    role: normative
    span:
      start: 99
      end: 208
    status: modeled
  - claim_key: CLAIM-12C32D7A69826609
    claim_text: Proposition-complete ingestion must keep accepting stored inventories that recorded the earlier definition role
    role: normative
    span:
      start: 210
      end: 321
    status: modeled
id: REQ-bootstrap-advisor-proposition-roles
type: req
---
Bootstrap requirement candidates must take each semantic inventory role from the semantic advisor. The semantic advisor must classify an obligation with a definition verb inside a relative clause as normative. Proposition-complete ingestion must keep accepting stored inventories that recorded the earlier definition role.

## Context

During onboarding of a test project, `kb_plan_bootstrap` recorded a modality-only role for each claim, while the write-time ingestion boundary compared that role with the advisor's own classification. Conditional claims ("If the export fails, the system must retry") were stored as normative but the advisor read them as condition, and obligations that name a referent ("The panel that refers to the order must show its status") were read as definitions. Both shapes were refused as `invalid_write` during apply. Bootstrap, `kb_model` and typed logic plans now ask the advisor for the role, and the boundary still accepts inventories written with the older definition role so existing knowledge bases keep validating.
