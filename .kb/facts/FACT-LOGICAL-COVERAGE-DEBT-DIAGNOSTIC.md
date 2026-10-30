---
id: FACT-LOGICAL-COVERAGE-DEBT-DIAGNOSTIC
title: Missing manifests remain visible logical-coverage debt
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - logical-coverage
  - diagnostics
fact_kind: property_value
subject_key: kibi.logic.coverage
property_key: unmanifested_requirements_without_debt_diagnostic
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-5C075A0CE1F05208
claim_text: Every current requirement without a logic_claims manifest must receive a non-blocking logical-coverage debt diagnostic
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the gradual logical-coverage backfill signal.
