---
title: Small predicate vocabularies are skipped
status: active
fact_kind: predicate
predicate_name: check_exemption_policy
predicate_namespace: kibi.checks
predicate_args:
  - ontology_quality
  - below_minimum_fact_count
polarity: assert
canonical_key: check_exemption_policy(ontology_quality,below_minimum_fact_count)
claim_key: CLAIM-47F6BF1F16E3BC9D
claim_text: Ontology-quality must not report predicates with fewer facts than the configured minimum
text_ref: .kb/requirements/REQ-kibi-ontology-quality.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-ONTOLOGY-QUALITY-MINIMUM-FACTS
type: fact
---
