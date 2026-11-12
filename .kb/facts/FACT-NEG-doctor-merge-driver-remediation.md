---
title: kibi doctor tells a repository whose .gitattributes routes the manifests to add the lines again
status: active
fact_kind: predicate
predicate_name: doctor_remediation_policy
predicate_args:
  - manifest_merge_driver
  - gitattributes_routes_manifests
  - name_only_git_config_command
predicate_namespace: kibi.cli
polarity: deny
canonical_key: doctor_remediation_policy(manifest_merge_driver,gitattributes_routes_manifests,name_only_git_config_command)
origin:
  kind: agent
  recorded_at: '2026-11-05T11:46:52.509Z'
id: FACT-NEG-doctor-merge-driver-remediation
type: fact
---
kibi doctor tells a repository whose .gitattributes routes the manifests to add the lines again. The failure-side scenario of REQ-cli-doctor-merge-driver-remediation assumes this state and expects Kibi to report it instead of carrying on silently.