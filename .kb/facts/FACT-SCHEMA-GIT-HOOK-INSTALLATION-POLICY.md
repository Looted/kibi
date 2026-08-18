---
title: Git hook installation policy schema
status: active
tags:
  - ontology
  - git
  - hooks
  - installation
  - install Git hooks by default
fact_kind: predicate_schema
predicate_name: git_hook_installation_policy
predicate_namespace: kibi.git
predicate_arity: 3
argument_names:
  - command
  - hooks
  - default_mode
argument_types:
  - command
  - hook_set
  - mode
argument_descriptions:
  - Command that installs hooks.
  - Concrete Git hook set.
  - Whether installation is enabled by default.
aliases:
  - install Git hooks by default
  - post-checkout and post-merge hooks
examples:
  - git_hook_installation_policy(kibi_init,post_checkout_and_post_merge,enabled_by_default)
id: FACT-SCHEMA-GIT-HOOK-INSTALLATION-POLICY
type: fact
---
