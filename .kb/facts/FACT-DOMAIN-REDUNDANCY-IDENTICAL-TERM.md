---
title: Identical ground terms across requirements are redundancy warnings
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - domain_redundancy
  - identical_ground_term
  - warning
polarity: assert
canonical_key: check_finding_policy(domain_redundancy,identical_ground_term,warning)
claim_key: CLAIM-F9D8E534A7DCB715
claim_text: Kibi check must report two distinct current requirements that ground the identical logical term as a domain-redundancy warning with exact witnesses
text_ref: .kb/requirements/REQ-kibi-domain-redundancy.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-DOMAIN-REDUNDANCY-IDENTICAL-TERM
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
