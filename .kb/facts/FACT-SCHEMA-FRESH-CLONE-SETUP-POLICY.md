---
id: FACT-SCHEMA-FRESH-CLONE-SETUP-POLICY
title: Fresh clone setup policy predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.setup
predicate_name: fresh_clone_setup_policy
predicate_arity: 3
argument_names:
  - actor
  - condition
  - required_action
argument_types:
  - kibi_surface
  - setup_condition
  - setup_action
argument_descriptions:
  - Kibi command or surface that acts.
  - Checkout or configuration condition that triggers the action.
  - Action the surface must take.
examples:
  - "fresh_clone_setup_policy(kibi_init,agent_instructions_on,write_marker_delimited_agents_md_section)"
type: fact
---

Grounds what Kibi must do so a fresh clone works without manual setup.
