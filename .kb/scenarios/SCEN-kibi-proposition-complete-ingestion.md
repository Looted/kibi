---
id: SCEN-kibi-proposition-complete-ingestion
title: Reject incomplete requirement ledgers without stranding legacy projects
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/scenarios/SCEN-kibi-proposition-complete-ingestion.md
tags: [requirements, semantic-inventory, ingestion, e2e]
links:
  - type: verified_by
    target: TEST-kibi-proposition-complete-ingestion
---

Given a current requirement submitted through `kb_validate_upsert` or `kb_upsert`, when its assertive prose omits a proposition, reuses a claim key or span, drifts from its recorded source hash, labels an assertion nonlogical, or links a modeled proposition to the wrong claim fact, then ingestion fails before mutation with repair guidance.

Given an existing project with requirement Markdown that predates proposition ledgers, when the first compatible sync establishes a semantic baseline, then the project remains usable; when a new requirement is added or an existing requirement's semantic prose changes after that baseline, sync requires a complete source-bound ledger. Explicit `ambiguous`, `ontology_gap`, or `missing` entries may be ingested but remain unresolved and cannot support a proven requirement.
