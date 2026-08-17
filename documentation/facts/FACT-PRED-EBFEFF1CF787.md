---
title: Git hook installation policy for kibi init
status: active
text_ref: documentation/requirements/REQ-git-hook-sync-v2.md
tags:
  - lane:ontology
  - predicate-suggestion
  - git
  - hooks
  - installation
fact_kind: predicate
predicate_name: git_hook_installation_policy
predicate_namespace: kibi.git
predicate_args:
  - kibi_init
  - post_checkout_and_post_merge
  - enabled_by_default
canonical_key: git_hook_installation_policy(kibi_init,post_checkout_and_post_merge,enabled_by_default)
polarity: assert
claim_key: CLAIM-57A1D330DEA165C0
claim_text: '`kibi init` must install the `post-checkout` and `post-merge` Git hooks by default'
id: FACT-PRED-EBFEFF1CF787
type: fact
---
