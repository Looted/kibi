---
title: Git effective hooks directory resolution policy
status: active
fact_kind: predicate_schema
predicate_name: git_effective_hooks_path_policy
predicate_arity: 4
argument_names:
  - command_surface
  - resolver
  - directory_role
  - repository_context
argument_types:
  - command_surface
  - git_path_resolver
  - hooks_directory
  - repository_context
argument_descriptions:
  - The Kibi command surfaces governed by this policy.
  - The Git mechanism used to resolve hooks.
  - The role of the resolved hooks directory.
  - Repository layouts and invocation locations covered by the policy.
aliases:
  - Git effective hooks directory resolution policy
examples:
  - git_effective_hooks_path_policy(kibi_init_and_doctor,git_rev_parse_git_path_hooks,effective_git_hooks_directory,linked_worktree_and_subdirectory)
tags:
  - ontology
  - git
  - hooks
  - effective-path
id: FACT-SCHEMA-GIT-HOOK-EFFECTIVE-PATH-POLICY
type: fact
---
