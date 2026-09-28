---
title: Replace failures fall back to builtin
status: active
fact_kind: predicate
predicate_name: capability_mode
predicate_namespace: kibi.capability
predicate_args:
  - vocabulary_alignment
  - replace
  - builtin_fallback_stamped
polarity: assert
canonical_key: capability_mode(vocabulary_alignment,replace,builtin_fallback_stamped)
claim_key: CLAIM-DA2FD0C3D582E9AC
claim_text: A failed replace-mode vocabulary-alignment provider must fall back to the builtin provider with fallbackUsed stamped
text_ref: .kb/requirements/REQ-kibi-vocabulary-alignment-capability.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-VOCABULARY-ALIGNMENT-REPLACE-FALLBACK
type: fact
---
