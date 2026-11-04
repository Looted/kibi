---
title: Kibi init records the fresh-clone setup choices
status: active
tags:
  - lane:ontology
  - predicate:git
  - predicate:hooks
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_namespace: kibi.setup
predicate_args:
  - kibi_init
  - setup_choices
  - record_auto_sync_prepare_hooks_agent_instructions_ci_gate
polarity: assert
claim_key: CLAIM-4B22B74393700AB6
claim_text: The `kibi init` command must record four setup choices (autoSync, prepareHooks, agentInstructions, ciGate) in the repository
text_ref: .kb/requirements/REQ-kibi-init-setup-choices.md
origin:
  kind: agent
  recorded_at: '2026-11-03T15:26:24.672Z'
canonical_key: fresh_clone_setup_policy(kibi_init,setup_choices,record_auto_sync_prepare_hooks_agent_instructions_ci_gate)
id: FACT-PRED-fresh-clone-setup-choices
type: fact
---
Kibi init records the fresh-clone setup choices. This predicate grounds the claim of REQ-kibi-fresh-clone-setup quoted in claim_text, so the requirement's semantic inventory counts it as modeled.