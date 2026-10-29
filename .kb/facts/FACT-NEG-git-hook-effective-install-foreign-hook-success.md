---
title: Kibi init finds a foreign pre-commit hook it must leave untouched and could announce it as installed
status: active
fact_kind: predicate
predicate_name: git_hook_install_result_policy
predicate_args:
  - kibi_init
  - repository_subdirectory
  - repository_root
  - repository_managed_hooks_directory
  - per_hook_installation_result
  - installed_and_updated_only
polarity: deny
canonical_key: git_hook_install_result_policy(kibi_init,repository_subdirectory,repository_root,repository_managed_hooks_directory,per_hook_installation_result,installed_and_updated_only)
origin:
  kind: agent
  recorded_at: '2026-10-29T20:53:29.865Z'
id: FACT-NEG-git-hook-effective-install-foreign-hook-success
type: fact
---
