---
title: A repository whose setup choices are not recorded where every clone reads them
status: active
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_namespace: kibi.setup
predicate_args:
  - kibi_init
  - setup_choices
  - record_auto_sync_prepare_hooks_agent_instructions_ci_gate
polarity: deny
canonical_key: fresh_clone_setup_policy(kibi_init,setup_choices,record_auto_sync_prepare_hooks_agent_instructions_ci_gate)
origin:
  kind: agent
  recorded_at: '2026-11-03T16:09:01.295Z'
id: FACT-NEG-fresh-clone-setup-choices
type: fact
---
A repository whose setup choices are not recorded where every clone reads them. The failure-side scenario of REQ-kibi-fresh-clone-setup assumes this state and expects Kibi to report it instead of carrying on silently.