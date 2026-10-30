---
title: Kibi init runs in a repository whose Git hooks lefthook already owns and would install its own hooks there
status: active
fact_kind: predicate
predicate_name: git_hook_installation_policy
predicate_args:
  - kibi_init_and_doctor
  - hooks_owned_by_lefthook_husky_or_pre_commit
  - print_and_read_manager_configuration_without_installing
polarity: deny
canonical_key: git_hook_installation_policy(kibi_init_and_doctor,hooks_owned_by_lefthook_husky_or_pre_commit,print_and_read_manager_configuration_without_installing)
origin:
  kind: agent
  recorded_at: '2026-10-29T20:57:14.913Z'
id: FACT-NEG-git-hook-manager-integration-lefthook-owned-hooks
type: fact
---
