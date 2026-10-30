---
title: Typed kb_query answers carry rows and a factQuery block with schema, distinct counts, suggestions, warnings and next call
status: active
fact_kind: property_value
subject_key: kibi.cli.query
property_key: typed_answer_contents
operator: includes
value_type: set
value_set:
  - matching_fact_rows
  - schema_used
  - distinct_value_counts
  - existing_values_when_nothing_matched
  - undeclared_argument_warnings
  - next_kb_query_call
claim_key: CLAIM-D8380B9B3A13AC50
claim_text: Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make
text_ref: .kb/requirements/REQ-kibi-query-fact-filters.md
tags:
  - lane:ontology
  - query
  - search-lane
origin:
  kind: agent
  recorded_at: '2026-10-11T15:19:00.837Z'
id: FACT-QUERY-FACT-QUERY-BLOCK
type: fact
---
