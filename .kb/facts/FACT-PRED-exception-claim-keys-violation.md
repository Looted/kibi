---
title: exempts_claims outside an exempted requirement is a blocking violation
status: active
tags:
  - lane:ontology
  - scenario-feasibility
  - exceptions
claim_key: CLAIM-69F3C5FF37A62A1E
claim_text: kb_check must report an exception whose exempts_claims names a claim key that is not a claim of a requirement it exempts as a blocking violation
text_ref: .kb/requirements/REQ-kibi-scenario-feasibility-v2.md
fact_kind: predicate
predicate_name: check_finding_policy
predicate_args:
  - exception_claim_keys
  - exempts_claims_outside_exempted_requirement
  - blocking_violation
polarity: assert
canonical_key: check_finding_policy(exception_claim_keys,exempts_claims_outside_exempted_requirement,blocking_violation)
predicate_namespace: kibi.checks
origin:
  kind: agent
  recorded_at: '2026-10-04T02:28:25.108Z'
id: FACT-PRED-exception-claim-keys-violation
type: fact
---
