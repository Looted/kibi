---
title: Undeclared argument constants are conformance warnings
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - predicate_schema_conformance
  - undeclared_argument_constant
  - warning
polarity: assert
canonical_key: check_finding_policy(predicate_schema_conformance,undeclared_argument_constant,warning)
claim_key: CLAIM-320CB2C9E465DDBA
claim_text: Kibi check must report a predicate fact that uses an undeclared argument constant as a predicate-schema-conformance warning
text_ref: .kb/requirements/REQ-kibi-predicate-schema-conformance.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-CONFORMANCE-UNDECLARED-CONSTANT
type: fact
---
