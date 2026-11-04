---
title: A session starts in a checkout without Kibi's hooks and the agent is not told
status: active
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_namespace: kibi.setup
predicate_args:
  - kibi_harness_plugin_session_start
  - kibi_hooks_missing_from_checkout
  - tell_agent_how_to_install_hooks
polarity: deny
canonical_key: fresh_clone_setup_policy(kibi_harness_plugin_session_start,kibi_hooks_missing_from_checkout,tell_agent_how_to_install_hooks)
origin:
  kind: agent
  recorded_at: '2026-11-03T16:09:05.960Z'
id: FACT-NEG-fresh-clone-missing-hooks-note
type: fact
---
A session starts in a checkout without Kibi's hooks and the agent is not told. The failure-side scenario of REQ-kibi-fresh-clone-setup assumes this state and expects Kibi to report it instead of carrying on silently.