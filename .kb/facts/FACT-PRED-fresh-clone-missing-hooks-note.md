---
title: Kibi's harness plugins note missing Kibi hooks at session start
status: active
tags:
  - lane:ontology
  - predicate:git
  - predicate:hooks
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_namespace: kibi.setup
predicate_args:
  - kibi_harness_plugin_session_start
  - kibi_hooks_missing_from_checkout
  - tell_agent_how_to_install_hooks
polarity: assert
claim_key: CLAIM-4DDE018E0A6BF11D
claim_text: Kibi's harness plugins must tell the agent at session start when Kibi's Git hooks are missing from the checkout
text_ref: .kb/requirements/REQ-kibi-fresh-clone-setup.md
origin:
  kind: agent
  recorded_at: '2026-11-03T16:08:21.652Z'
canonical_key: fresh_clone_setup_policy(kibi_harness_plugin_session_start,kibi_hooks_missing_from_checkout,tell_agent_how_to_install_hooks)
id: FACT-PRED-fresh-clone-missing-hooks-note
type: fact
---
Kibi's harness plugins note missing Kibi hooks at session start. This predicate grounds the claim of REQ-kibi-fresh-clone-setup quoted in claim_text, so the requirement's semantic inventory counts it as modeled.