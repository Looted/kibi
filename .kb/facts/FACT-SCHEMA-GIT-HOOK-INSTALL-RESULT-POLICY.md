---
title: Git hook installation path and result reporting policy
status: active
fact_kind: predicate_schema
predicate_name: git_hook_install_result_policy
predicate_arity: 6
argument_names:
  - command
  - invocation_context
  - state_root
  - hooks_directory_scope
  - result_reporting
  - success_aggregation
argument_types:
  - command
  - repository_context
  - repository_root
  - hooks_directory_scope
  - result_reporting
  - success_policy
argument_descriptions:
  - The command that installs hooks.
  - The invocation location or repository layout.
  - The repository location from which project state is derived.
  - The permitted hooks directory scope.
  - The granularity of installation results shown to the operator.
  - Which per-hook outcomes may appear in the aggregate success line.
aliases:
  - Git hook installation path and result reporting policy
examples:
  - git_hook_install_result_policy(kibi_init,repository_subdirectory,repository_root,repository_managed_hooks_directory,per_hook_results,installed_and_updated_only)
tags:
  - ontology
  - git
  - hooks
  - installation-results
id: FACT-SCHEMA-GIT-HOOK-INSTALL-RESULT-POLICY
type: fact
---
