---
title: AGENTS.md has no Kibi section while agent instructions are on
status: active
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_namespace: kibi.setup
predicate_args:
  - kibi_init
  - agent_instructions_on
  - write_marker_delimited_agents_md_section
polarity: deny
canonical_key: fresh_clone_setup_policy(kibi_init,agent_instructions_on,write_marker_delimited_agents_md_section)
origin:
  kind: agent
  recorded_at: '2026-11-03T16:09:02.353Z'
id: FACT-NEG-fresh-clone-agent-instructions
type: fact
---
AGENTS.md has no Kibi section while agent instructions are on. The failure-side scenario of REQ-kibi-fresh-clone-setup assumes this state and expects Kibi to report it instead of carrying on silently.