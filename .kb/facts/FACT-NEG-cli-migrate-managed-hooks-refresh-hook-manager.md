---
title: kibi migrate runs where lefthook owns the Git hooks and would rewrite the kibi-managed sections left there
status: active
fact_kind: predicate
predicate_name: git_hook_installation_policy
predicate_namespace: kibi.git
predicate_args:
  - kibi_migrate
  - outdated_kibi_managed_hook_sections
  - rewrite_managed_section_only_outside_hook_managers
polarity: deny
canonical_key: git_hook_installation_policy(kibi_migrate,outdated_kibi_managed_hook_sections,rewrite_managed_section_only_outside_hook_managers)
subject_key: kibi.git_hooks.managed
origin:
  kind: agent
  recorded_at: '2026-11-25T09:44:05.692Z'
id: FACT-NEG-cli-migrate-managed-hooks-refresh-hook-manager
type: fact
---
The failure side of the refresh: where a hook manager owns the Git hooks, leftover kibi-managed sections are the manager's to remove, so kibi migrate must not rewrite them.
