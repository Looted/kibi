---
title: No check-run read of the merge train goes out with a token that cannot read check runs
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: check_run_reads_without_checks_token
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-18T14:19:01.319Z'
id: FACT-ci-merge-train-checks-token
type: fact
claim_key: CLAIM-2B93121D26C03A3F
claim_text: The merge train must read check runs with its checks token, so a train whose github-token is a fine-grained personal access token can still read the checks it gates on
text_ref: REQ-ci-merge-train-checks-token
---
Counts check-run reads the merge train makes with github-token although a checks token is set; zero means every check-run read uses the checks token.