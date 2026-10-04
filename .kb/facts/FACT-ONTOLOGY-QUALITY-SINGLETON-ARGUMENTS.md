---
title: Mostly one-off predicate arguments are informational findings
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - ontology_quality
  - singleton_argument_ratio
  - info
polarity: assert
canonical_key: check_finding_policy(ontology_quality,singleton_argument_ratio,info)
claim_key: CLAIM-2DC407820ED898AF
claim_text: Kibi check must report a predicate whose argument values mostly occur in only one fact as informational ontology-quality
text_ref: .kb/requirements/REQ-kibi-ontology-quality.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-ONTOLOGY-QUALITY-SINGLETON-ARGUMENTS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
