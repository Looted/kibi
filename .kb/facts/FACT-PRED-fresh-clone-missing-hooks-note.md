---
title: Every harness notes missing Kibi hooks at session start
status: active
tags:
  - lane:ontology
  - predicate:git
  - predicate:hooks
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_args:
  - supported_harness_session_start
  - kibi_hooks_missing_from_checkout
  - tell_agent_how_to_install_hooks
polarity: assert
claim_key: CLAIM-8305FD6DAE83107E
claim_text: Every supported harness must tell the agent at session start when Kibi's Git hooks are missing from the checkout
text_ref: .kb/requirements/REQ-kibi-fresh-clone-setup.md
origin:
  kind: agent
  recorded_at: '2026-11-03T15:26:22.045Z'
canonical_key: fresh_clone_setup_policy(supported_harness_session_start,kibi_hooks_missing_from_checkout,tell_agent_how_to_install_hooks)
id: FACT-PRED-fresh-clone-missing-hooks-note
type: fact
---
Every harness notes missing Kibi hooks at session start. This predicate grounds the claim of REQ-kibi-fresh-clone-setup quoted in claim_text, so the requirement's semantic inventory counts it as modeled.