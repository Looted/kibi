---
title: The `kibi doctor` command runs a series of diagnostic checks to verify
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi_doctor_command
  - diagnostic_checks
  - environment_and_kb_setup_verified
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi_doctor_command,diagnostic_checks,environment_and_kb_setup_verified)
polarity: assert
claim_key: CLAIM-B57914657DBD0FDB
claim_text: The `kibi doctor` command runs a series of diagnostic checks to verify that the local environment (SWI-Prolog version, git) and the project KB setup (.kb directory, config, hooks) are correctly configured and healthy
tags:
  - lane:ontology
  - requirements
id: FACT-cli-doctor-BD0FDB
type: fact
---
