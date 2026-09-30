---
title: Filename stem mismatch is an entity-id-style warning
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - entity_id_style
  - filename_stem_mismatch
  - warning
polarity: assert
canonical_key: check_finding_policy(entity_id_style,filename_stem_mismatch,warning)
claim_key: CLAIM-3BC678A2B9042C97
claim_text: Kibi must report an entity whose Markdown filename stem differs from its frontmatter id as an entity-id-style warning
text_ref: .kb/requirements/REQ-kibi-entity-id-style.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-ENTITY-ID-STYLE-STEM-MISMATCH
type: fact
---
