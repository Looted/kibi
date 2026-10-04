---
title: All entity and relationship mutations in the KB are recorded in a pers
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.audit.log
  - branch_audit_log
  - recorded_persistent_entry
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.audit.log,branch_audit_log,recorded_persistent_entry)
polarity: assert
claim_key: CLAIM-3F9DB0AE7FC227B0
claim_text: All entity and relationship mutations in the KB are recorded in a persistent audit log (audit.log) in the branch directory
tags:
  - lane:ontology
  - requirements
id: FACT-core-audit-logging-C227B0
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
