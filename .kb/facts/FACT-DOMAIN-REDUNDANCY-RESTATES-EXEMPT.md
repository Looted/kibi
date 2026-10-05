---
title: Restating pairs are exempt from redundancy
status: active
fact_kind: predicate
predicate_name: check_exemption_policy
predicate_namespace: kibi.checks
predicate_args:
  - domain_redundancy
  - restates_link
polarity: assert
canonical_key: check_exemption_policy(domain_redundancy,restates_link)
claim_key: CLAIM-268FAFE8C9833ECC
claim_text: Requirement pairs linked by restates must be exempt from domain-redundancy
text_ref: .kb/requirements/REQ-kibi-domain-redundancy.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-DOMAIN-REDUNDANCY-RESTATES-EXEMPT
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
