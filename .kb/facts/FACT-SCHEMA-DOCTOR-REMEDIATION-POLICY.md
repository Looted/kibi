---
title: Doctor remediation policy schema
status: active
fact_kind: predicate_schema
predicate_name: doctor_remediation_policy
predicate_namespace: kibi.cli
predicate_arity: 3
argument_names:
  - check
  - situation
  - remediation
argument_types:
  - doctor_check
  - setup_situation
  - remediation_rule
argument_descriptions:
  - kibi doctor check that reports the gap.
  - Setup state the check finds in the repository.
  - What the check's remediation must and must not name in that state.
examples:
  - doctor_remediation_policy(manifest_merge_driver,gitattributes_routes_manifests,name_only_git_config_command)
tags:
  - ontology
  - doctor
origin:
  kind: agent
  recorded_at: '2026-11-05T11:54:12.491Z'
id: FACT-SCHEMA-DOCTOR-REMEDIATION-POLICY
type: fact
---
Predicate schema for what a kibi doctor check's remediation names in a given setup state, so the remediation advice for a repository can be grounded and compared with the repository's actual setup.