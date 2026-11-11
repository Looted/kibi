---
title: Kibi init writes a managed Kibi section into AGENTS.md
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
  - agent_instructions_on
  - write_marker_delimited_agents_md_section
polarity: assert
claim_key: CLAIM-3D7E7357520EB243
claim_text: The `kibi init` command must write a marker-delimited Kibi section into AGENTS.md when agentInstructions is on
text_ref: .kb/requirements/REQ-kibi-init-setup-choices.md
origin:
  kind: agent
  recorded_at: '2026-11-03T15:26:19.086Z'
canonical_key: fresh_clone_setup_policy(kibi_init,agent_instructions_on,write_marker_delimited_agents_md_section)
id: FACT-PRED-fresh-clone-agent-instructions
type: fact
---
Kibi init writes a managed Kibi section into AGENTS.md. This predicate grounds the claim of REQ-kibi-init-setup-choices quoted in claim_text, so the requirement's semantic inventory counts it as modeled.