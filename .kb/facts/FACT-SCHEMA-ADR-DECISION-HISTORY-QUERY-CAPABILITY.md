---
title: ADR decision-history query capability schema
status: active
tags:
  - lane:ontology
  - predicate-schema
  - adr
  - history
  - query
fact_kind: predicate_schema
predicate_name: adr_decision_history_query_capability
predicate_namespace: kibi.adr
predicate_arity: 4
argument_names:
  - history_scope
  - topic_scope
  - evolution_visibility
  - effective_resolution
argument_types:
  - history_scope
  - topic_scope
  - visibility
  - resolution
argument_descriptions:
  - Extent of architectural decision history returned.
  - Topic scope accepted by the query.
  - Whether decision evolution over time is visible.
  - Whether the currently effective ADR is resolved.
examples:
  - adr_decision_history_query_capability(complete_decision_history,any_topic,evolution_over_time,currently_effective_adr)
id: FACT-SCHEMA-ADR-DECISION-HISTORY-QUERY-CAPABILITY
type: fact
---
