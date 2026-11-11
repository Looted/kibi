---
title: A nested harness working directory is taken as the workspace root
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.env_bootstrap
property_key: workspace_resolver
operator: eq
value_type: string
value_string: harness_working_directory
origin:
  kind: agent
  recorded_at: '2026-11-04T15:08:12.874Z'
id: FACT-NEG-kibi-env-bootstrap-HARNESS-CWD
type: fact
---
The harness's own working directory, below the workspace, is used as the Kibi workspace root, so env files and plugin configuration are looked up in the wrong place.
