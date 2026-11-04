---
title: Kibi init adds a prepare step that installs its Git hooks
status: active
tags:
  - lane:ontology
  - predicate:git
  - predicate:hooks
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_args:
  - kibi_init
  - prepare_hooks_on_without_hook_manager
  - add_package_json_prepare_step_installing_hooks
polarity: assert
claim_key: CLAIM-BC78880CDC1510BE
claim_text: The `kibi init` command must add a package.json prepare step that installs Kibi's Git hooks when prepareHooks is on, unless a hook manager owns the hooks
text_ref: .kb/requirements/REQ-kibi-fresh-clone-setup.md
origin:
  kind: agent
  recorded_at: '2026-11-03T15:26:23.290Z'
canonical_key: fresh_clone_setup_policy(kibi_init,prepare_hooks_on_without_hook_manager,add_package_json_prepare_step_installing_hooks)
id: FACT-PRED-fresh-clone-prepare-hooks
type: fact
---
Kibi init adds a prepare step that installs its Git hooks. This predicate grounds the claim of REQ-kibi-fresh-clone-setup quoted in claim_text, so the requirement's semantic inventory counts it as modeled.