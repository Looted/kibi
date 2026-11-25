---
title: Exempts Only The Maintainer And Bots = true
status: active
text_ref: .github/workflows/cla.yml
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - governance
  - ci
fact_kind: property_value
subject_key: kibi.repository.cla_check
property_key: exempts_only_maintainer_and_bots
operator: eq
value_type: bool
value_bool: true
canonical_key: kibi.repository.cla_check:exempts_only_maintainer_and_bots:eq:true
claim_key: CLAIM-8402CC174E5F20C0
claim_text: The CLA check must exempt only the maintainer account and bot accounts
claim_span_start: 199
claim_span_end: 269
origin:
  kind: agent
  recorded_at: '2026-11-25T06:09:54.341Z'
id: FACT-cla-check-exempts-maintainer-and-bots
type: fact
---
The CLA check must exempt only the maintainer account and bot accounts.