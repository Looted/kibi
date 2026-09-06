---
title: SkillOpt cursor compatibility lane gates evaluation before spend
status: open
tags:
  - skillopt
  - cursor
  - compatibility
semantic_text: The SkillOpt cursor operator must parse its qualify and compat commands strictly and must run the cursor compatibility lane before any paid evaluation cells are spent. The lane must gate evaluation on a passing cursor qualification check, summarize per-variant cell outcomes with absolute floors, and persist a compatibility report without recording account data. When arguments or gates are invalid, the operator fails closed with a usage error instead of launching cells.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 43f9f9792a35ef77d36e514739f56b2282d3235d4f917029aeb22a1908a0f6c1
semantic_inventory:
  - claim_key: CLAIM-EB0CB5AD393F637A
    claim_text: The SkillOpt cursor operator must parse its qualify
    role: normative
    status: modeled
    span:
      start: 0
      end: 51
  - claim_key: CLAIM-D19905F495ABB7C3
    claim_text: compat commands strictly and must run the cursor compatibility lane before any paid evaluation cells are spent
    role: normative
    status: modeled
    span:
      start: 56
      end: 166
  - claim_key: CLAIM-5F4C5857DF9E298C
    claim_text: The lane must gate evaluation on a passing cursor qualification check, summarize per-variant cell outcomes with absolute floors, and persist a compatibility report without recording account data
    role: normative
    status: modeled
    span:
      start: 168
      end: 362
  - claim_key: CLAIM-6B4082378C35EDE1
    claim_text: When arguments or gates are invalid, the operator fails closed with a usage error instead of launching cells
    role: condition
    status: modeled
    span:
      start: 364
      end: 472
logic_claims:
  - CLAIM-EB0CB5AD393F637A
  - CLAIM-D19905F495ABB7C3
  - CLAIM-5F4C5857DF9E298C
  - CLAIM-6B4082378C35EDE1
id: REQ-skillopt-cursor-compat
type: req
semantic_clauses:
  - The SkillOpt cursor operator must parse its qualify
  - compat commands strictly and must run the cursor compatibility lane before any paid evaluation cells are spent
  - The lane must gate evaluation on a passing cursor qualification check, summarize per-variant cell outcomes with absolute floors, and persist a compatibility report without recording account data
  - When arguments or gates are invalid, the operator fails closed with a usage error instead of launching cells
---
The SkillOpt cursor operator must parse its qualify and compat commands strictly and must run the cursor compatibility lane before any paid evaluation cells are spent. The lane must gate evaluation on a passing cursor qualification check, summarize per-variant cell outcomes with absolute floors, and persist a compatibility report without recording account data. When arguments or gates are invalid, the operator fails closed with a usage error instead of launching cells.
