---
title: 'Predicate: not conditional_behavior(kibi_kb_merge_workflow,before_merging,install_pull_request_branch_dependencies)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_kb_merge_workflow
  - before_merging
  - install_pull_request_branch_dependencies
canonical_key: conditional_behavior(kibi_kb_merge_workflow,before_merging,install_pull_request_branch_dependencies)
polarity: deny
claim_key: CLAIM-2EE353F4577820C0
claim_text: The Kibi KB merge workflow must not install the pull request branch dependencies before merging
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - ci
  - merge
id: FACT-PRED-ci-kb-merge-no-pr-install
type: fact
---
