---
title: Hook managers keep their Git hooks; Kibi prints their configuration
status: active
tags:
  - lane:ontology
  - predicate:git
  - predicate:hooks
fact_kind: predicate
predicate_name: git_hook_installation_policy
predicate_args:
  - kibi_init_and_doctor
  - hooks_owned_by_lefthook_husky_or_pre_commit
  - print_and_read_manager_configuration_without_installing
polarity: assert
canonical_key: git_hook_installation_policy(kibi_init_and_doctor,hooks_owned_by_lefthook_husky_or_pre_commit,print_and_read_manager_configuration_without_installing)
claim_key: CLAIM-BE41ACA9963AF91D
claim_text: '`kibi init` must not install Git hooks when lefthook, husky or the pre-commit framework manages them, and must print that manager''s configuration for Kibi''s hook commands instead. `kibi init --print-hook` must print Kibi''s hook commands in shell, lefthook, husky and pre-commit formats. `kibi doctor` must read Kibi''s hook commands from the hook manager configuration'
text_ref: .kb/requirements/REQ-git-hook-manager-integration.md
origin:
  kind: agent
  recorded_at: '2026-10-29T18:37:45.448Z'
id: FACT-PRED-git-hook-manager-init
type: fact
---
Hook managers keep their Git hooks; Kibi prints their configuration. This predicate grounds the claim of REQ-git-hook-manager-integration quoted in claim_text, so the requirement's semantic inventory counts it as modeled.