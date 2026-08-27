---
title: kibi init installs the pre-commit hook by default
status: active
text_ref: documentation/requirements/REQ-014.md
tags:
  - lane:ontology
  - strict-semantics
  - git
  - hooks
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.git
predicate_name: git_hook_installation_policy
predicate_args:
  - kibi_init
  - pre_commit
  - enabled_by_default
canonical_key: git_hook_installation_policy(kibi_init,pre_commit,enabled_by_default)
claim_key: CLAIM-25B1A21FBA8F8B08
claim_text: '`kibi init` installs a pre-commit git hook by default'
id: FACT-REQ-014-PRE-COMMIT-HOOK-INSTALLATION
type: fact
---
`kibi init` installs a pre-commit git hook by default.

