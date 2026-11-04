---
title: package.json has no prepare step that installs Kibi's hooks while prepare hooks are on
status: active
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_namespace: kibi.setup
predicate_args:
  - kibi_init
  - prepare_hooks_on_without_hook_manager
  - add_package_json_prepare_step_installing_hooks
polarity: deny
canonical_key: fresh_clone_setup_policy(kibi_init,prepare_hooks_on_without_hook_manager,add_package_json_prepare_step_installing_hooks)
origin:
  kind: agent
  recorded_at: '2026-11-03T16:09:03.600Z'
id: FACT-NEG-fresh-clone-prepare-hooks
type: fact
---
package.json has no prepare step that installs Kibi's hooks while prepare hooks are on. The failure-side scenario of REQ-kibi-fresh-clone-setup assumes this state and expects Kibi to report it instead of carrying on silently.