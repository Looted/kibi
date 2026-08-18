---
title: Runtime-only edges are exempt from reverse ownership
status: active
text_ref: documentation/requirements/REQ-kibi-source-relationship-parity.md
tags:
  - lane:ontology
  - relationship-parity
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.validation
predicate_name: source_relationship_parity_policy
predicate_args:
  - runtime_only_source_entities
  - compiled_to_authored
  - reverse_source_ownership
  - exempt
canonical_key: source_relationship_parity_policy(runtime_only_source_entities,compiled_to_authored,reverse_source_ownership,exempt)
claim_key: CLAIM-DC162540AEA7A2B4
claim_text: Compiled relationships owned by explicit runtime-only source entities are exempt from reverse source ownership only
id: FACT-SOURCE-PARITY-RUNTIME-REVERSE-EXEMPT
type: fact
---
Compiled relationships owned by explicit runtime-only source entities are exempt from reverse source ownership only.

