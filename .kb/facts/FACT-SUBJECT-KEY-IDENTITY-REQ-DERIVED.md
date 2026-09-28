---
title: Requirement-derived subject keys are warnings
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - subject_key_identity
  - requirement_derived_subject_key
  - warning
polarity: assert
canonical_key: check_finding_policy(subject_key_identity,requirement_derived_subject_key,warning)
claim_key: CLAIM-82048A289457633B
claim_text: Kibi check must report a subject key derived from a requirement ID as a subject-key-identity warning
text_ref: .kb/requirements/REQ-kibi-subject-vocabulary.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-SUBJECT-KEY-IDENTITY-REQ-DERIVED
type: fact
---
