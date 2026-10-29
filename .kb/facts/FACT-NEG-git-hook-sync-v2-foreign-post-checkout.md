---
title: Kibi init cannot install its default post-checkout hook because a foreign post-checkout hook already exists
status: active
fact_kind: predicate
predicate_name: git_hook_installation_policy
predicate_args:
  - kibi_init
  - post_checkout_and_post_merge
  - enabled_by_default
polarity: deny
predicate_namespace: kibi.git
canonical_key: git_hook_installation_policy(kibi_init,post_checkout_and_post_merge,enabled_by_default)
origin:
  kind: agent
  recorded_at: '2026-10-29T20:57:35.966Z'
id: FACT-NEG-git-hook-sync-v2-foreign-post-checkout
type: fact
---
