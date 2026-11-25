---
title: kibi migrate rewrites outdated kibi-managed hook sections and leaves other hooks alone
status: active
tags:
  - lane:ontology
  - predicate:git
  - predicate:hooks
fact_kind: predicate
predicate_name: git_hook_installation_policy
predicate_namespace: kibi.git
predicate_args:
  - kibi_migrate
  - outdated_kibi_managed_hook_sections
  - rewrite_managed_section_only_outside_hook_managers
polarity: assert
claim_key: CLAIM-96BEC295651FB56D
claim_text: kibi migrate must rewrite a Git hook's kibi-managed section when that section differs from the template the running CLI installs, and must leave a hook unchanged when a hook manager owns it or it has no kibi-managed section
text_ref: .kb/requirements/REQ-cli-migrate-managed-hooks-refresh.md
canonical_key: git_hook_installation_policy(kibi_migrate,outdated_kibi_managed_hook_sections,rewrite_managed_section_only_outside_hook_managers)
subject_key: kibi.git_hooks.managed
origin:
  kind: agent
  recorded_at: '2026-11-25T09:44:00.236Z'
id: FACT-PRED-cli-migrate-managed-hooks-refresh
type: fact
---
kibi migrate rewrites outdated kibi-managed hook sections and leaves other hooks alone. This predicate grounds the claim of REQ-cli-migrate-managed-hooks-refresh quoted in claim_text, so the requirement's semantic inventory counts it as modeled.
