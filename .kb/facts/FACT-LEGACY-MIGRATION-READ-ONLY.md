---
id: FACT-LEGACY-MIGRATION-READ-ONLY
title: Migration batches remain review-only
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/facts/FACT-LEGACY-MIGRATION-READ-ONLY.md
tags: [lane:ontology, requirements, migration, safety]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [legacy_migration_batch, preview_application_policy, read_only_non_auto_applicable_reviewed_patch]
canonical_key: logical_requirement_rule(legacy_migration_batch,preview_application_policy,read_only_non_auto_applicable_reviewed_patch)
polarity: assert
claim_key: CLAIM-783C35DFF9BFF1AF
claim_text: Every batch must be read-only, non-auto-applicable, and contain only a reviewed property-patch preview
claim_span_start: 1020
claim_span_end: 1122
---

Ground representation of preview-only application policy.
