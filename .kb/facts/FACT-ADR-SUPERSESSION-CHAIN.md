---
id: FACT-ADR-SUPERSESSION-CHAIN
title: ADR Supersession Chain Semantics
status: active
created_at: 2026-04-24T00:00:00.000Z
updated_at: 2026-04-24T00:00:00.000Z
source: documentation/facts/FACT-ADR-SUPERSESSION-CHAIN.md
tags:
  - adr
  - schema
fact_kind: property_value
subject_key: kibi.adr.supersession
property_key: chain_semantics
operator: eq
value_type: string
value_string: full_decision_history
polarity: require
claim_key: CLAIM-EF04808142A12E98
claim_text: The KB must support a supersedes(adr, adr) relationship type so the full chain of architectural decisions is machine-readable
text_ref: documentation/requirements/REQ-016.md
type: fact
---

supersedes(adr, adr) relationship chains represent the full architectural decision history.
