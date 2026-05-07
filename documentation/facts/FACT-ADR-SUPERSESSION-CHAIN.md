---
id: FACT-ADR-SUPERSESSION-CHAIN
title: ADR Supersession Chain Semantics
status: active
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
source: documentation/facts/FACT-ADR-SUPERSESSION-CHAIN.md
tags: [adr, schema]
fact_kind: property_value
subject_key: kibi.adr.supersession
property_key: chain_semantics
operator: eq
value_type: string
value_string: full_decision_history
polarity: require
---

supersedes(adr, adr) relationship chains represent the full architectural decision history.
