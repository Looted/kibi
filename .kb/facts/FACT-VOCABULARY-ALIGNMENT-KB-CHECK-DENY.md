---
title: kb_check never calls vocabulary providers
status: active
fact_kind: predicate
predicate_name: provider_allowed_operation
predicate_namespace: kibi.capability
predicate_args:
  - vocabulary_alignment_provider
  - kb_check
  - deny
polarity: assert
canonical_key: provider_allowed_operation(vocabulary_alignment_provider,kb_check,deny)
claim_key: CLAIM-6B989EA398629F55
claim_text: kb_check must never call a vocabulary-alignment provider
text_ref: .kb/requirements/REQ-kibi-vocabulary-alignment-capability.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-VOCABULARY-ALIGNMENT-KB-CHECK-DENY
type: fact
---
