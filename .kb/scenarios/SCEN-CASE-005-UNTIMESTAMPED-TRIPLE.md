---
title: A stored relationship without a provenance timestamp fails the schema round trip
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:01.365Z'
id: SCEN-CASE-005-UNTIMESTAMPED-TRIPLE
type: scenario
---
Given a knowledge base whose entities are linked with every first-class relationship type through the packed CLI, when the relationships are read back from the canonical shards, then each record carries an ISO-8601 created_at, a creator and a source, and a record without its timestamp fails the round trip.

This covers one violating item past the invariant, `gt 0` on `rdf_relationship_triples_without_provenance_timestamp`. documentation/tests/e2e/packed/schema-relationship-roundtrip.test.ts "round-trips the exact entity schema and timestamped typed relationships" exercises it by asserting an ISO timestamp on every expected relationship record.
