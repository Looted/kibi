---
title: An adapter accepts bootstrap input the shared planner refuses
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.bootstrap.plan
property_key: adapters_route_to_shared_planner
operator: eq
value_type: string
value_string: adapter_owns_bootstrap_contract
origin:
  kind: agent
  recorded_at: '2026-11-10T05:00:00.000Z'
id: FACT-NEG-kibi-bootstrap-shared-planner-routing-DIVERGENT-ADAPTER
type: fact
---
The MCP adapter and the CLI route answer the same plan-bootstrap input differently, because one of them validates against its own copy of the contract or silently drops a field the planner does not define.
