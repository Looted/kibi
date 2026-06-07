---
id: FACT-UPSERT-VALIDATION
title: Upsert Validation
status: active
created_at: 2026-02-20T14:40:00Z
updated_at: 2026-04-24T00:00:00Z
source: documentation/facts/FACT-UPSERT-VALIDATION.md
tags: [governance, validation]
fact_kind: property_value
subject_key: kibi.write.governance
property_key: upsert_validation_mode
operator: eq
value_type: string
value_string: schema_and_relationship_constraints
polarity: require
---

Every upsert is validated against schema and relationship constraints before persistence.
