---
title: Non-conventional subject keys are warnings
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - subject_key_shape
  - nonconventional_subject_key
  - warning
polarity: assert
canonical_key: check_finding_policy(subject_key_shape,nonconventional_subject_key,warning)
claim_key: CLAIM-4FCA4BED9A81A246
claim_text: Kibi check must report a subject key that is not dotted lowercase snake segments as a subject-key-shape warning
text_ref: .kb/requirements/REQ-kibi-subject-vocabulary.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-SUBJECT-KEY-SHAPE-NONCONVENTIONAL
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
