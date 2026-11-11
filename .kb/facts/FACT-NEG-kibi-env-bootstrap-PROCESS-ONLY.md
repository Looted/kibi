---
title: Doctor attributes every secret in the process env to the process
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.env_bootstrap
property_key: secret_attribution
operator: eq
value_type: string
value_string: current_process_env
origin:
  kind: agent
  recorded_at: '2026-11-04T15:08:16.701Z'
id: FACT-NEG-kibi-env-bootstrap-PROCESS-ONLY
type: fact
---
Doctor reads secret sources from the current process env only, so a secret the bootstrap loaded from a file is reported as coming from the process.
