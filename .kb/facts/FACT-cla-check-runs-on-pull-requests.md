---
title: Runs On Pull Requests And Sign Comments Without Checkout = true
status: active
text_ref: .github/workflows/cla.yml
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - governance
  - ci
fact_kind: property_value
subject_key: kibi.repository.cla_check
property_key: runs_on_pull_requests_and_sign_comments_without_checkout
operator: eq
value_type: bool
value_bool: true
canonical_key: kibi.repository.cla_check:runs_on_pull_requests_and_sign_comments_without_checkout:eq:true
claim_key: CLAIM-76365DF756687271
claim_text: The CLA workflow must run the CLA check when a pull request is opened, updated or closed, and when a pull request comment is the CLA sign sentence or recheck, without checking out pull request code
claim_span_start: 0
claim_span_end: 197
origin:
  kind: agent
  recorded_at: '2026-11-25T06:09:51.645Z'
id: FACT-cla-check-runs-on-pull-requests
type: fact
---
The CLA workflow must run the CLA check when a pull request is opened, updated or closed, and when a pull request comment is the CLA sign sentence or recheck, without checking out pull request code.