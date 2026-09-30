---
title: Implied numeric bounds are informational
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - domain_implication
  - implied_numeric_bound
  - info
polarity: assert
canonical_key: check_finding_policy(domain_implication,implied_numeric_bound,info)
claim_key: CLAIM-B4CFC71F96401E5A
claim_text: Kibi check must report a numeric bound that strictly implies another bound on the same subject and property as informational domain-implication
text_ref: .kb/requirements/REQ-kibi-domain-redundancy.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-DOMAIN-IMPLICATION-IMPLIED-BOUND
type: fact
---
