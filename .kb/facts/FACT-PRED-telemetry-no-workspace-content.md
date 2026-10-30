---
title: 'Predicate: not conditional_behavior(telemetry_event,any_telemetry_event,contain_workspace_content)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - any_telemetry_event
  - contain_workspace_content
canonical_key: conditional_behavior(telemetry_event,any_telemetry_event,contain_workspace_content)
polarity: deny
claim_key: CLAIM-A4F55BAE730997F5
claim_text: Telemetry events shall never contain file paths, queries, entity ids, KB content, error messages or repository names
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:39:29.459Z'
id: FACT-PRED-telemetry-no-workspace-content
type: fact
---
Telemetry events shall never contain file paths, queries, entity ids, KB content, error messages or repository names. Grounds one clause of REQ-kibi-anonymous-usage-telemetry as a conditional behavior of anonymous usage telemetry.