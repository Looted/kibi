---
title: Validate schema round-trip across entities and typed relationships
status: active
tags:
  - cli
  - schema
  - e2e
links:
  - type: verified_by
    target: TEST-kibi-entity-relationship-schema-roundtrip
id: SCEN-kibi-entity-relationship-schema-roundtrip
type: scenario
---

Given the packed KB and engine start from authored fixtures,
When entities and typed relationships are queried and reingested,
Then every canonical entity type and required schema property round-trips through persistence with typed provenance.
