---
id: FACT-LOGICAL-COVERAGE-DEFAULT-RULE
title: Declared logical manifests are validated by default
status: active
created_at: 2026-08-04T00:00:00Z
updated_at: 2026-08-04T00:00:00Z
source: documentation/facts/FACT-LOGICAL-COVERAGE-DEFAULT-RULE.md
tags: [lane:ontology, requirements, logical-coverage, validation]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [declared_logic_manifest, default_validation, gradual_backfill_without_manifest]
canonical_key: logical_requirement_rule(declared_logic_manifest,default_validation,gradual_backfill_without_manifest)
polarity: assert
claim_key: CLAIM-ECAE7557CD5C48F8
claim_text: The logic-coverage rule must run by default for explicitly manifested requirements while requirements without manifests remain gradual-backfill debt.
---

Ground representation of default structural enforcement without forcing incomplete legacy manifests.
