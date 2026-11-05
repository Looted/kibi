---
title: kibi doctor names only the git config command once .gitattributes routes the manifests
status: active
fact_kind: predicate
predicate_name: doctor_remediation_policy
predicate_args:
  - manifest_merge_driver
  - gitattributes_routes_manifests
  - name_only_git_config_command
predicate_namespace: kibi.cli
polarity: assert
canonical_key: doctor_remediation_policy(manifest_merge_driver,gitattributes_routes_manifests,name_only_git_config_command)
origin:
  kind: agent
  recorded_at: '2026-11-05T11:46:51.112Z'
claim_key: CLAIM-0ABAC5F4DF0DA14B
claim_text: When .gitattributes already routes .kb/symbols.yaml to merge=kibi, the kibi doctor merge driver remediation must name only the git config command that sets merge.kibi.driver
text_ref: .kb/requirements/REQ-cli-doctor-merge-driver-remediation.md
tags:
  - lane:ontology
id: FACT-PRED-doctor-merge-driver-remediation
type: fact
---
kibi doctor names only the git config command once .gitattributes routes the manifests. This predicate grounds the claim of REQ-cli-doctor-merge-driver-remediation quoted in claim_text, so the requirement's semantic inventory counts it as modeled.