---
title: kb_query answers typed questions about modeled facts and names the next call
status: open
required_evidence: tested
priority: must
tags:
  - discovery
  - query
  - facts
  - search-lane
  - progressive-disclosure
semantic_text: 'kb_query must answer typed questions about modeled facts: predicate facts selected by predicate name and order-free named arguments, strict property facts selected by subject key and property key, and facts listed by fact kind including the predicate schema catalog. Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make. Typed kb_query goals must be built from validated JSON input and never from caller-written Prolog. Each linked predicate, property or subject fact in a kb_search answer must carry its typed claim and the kb_query call that asks about it.'
semantic_clauses:
  - 'kb_query must answer typed questions about modeled facts: predicate facts selected by predicate name and order-free named arguments, strict property facts selected by subject key and property key, and facts listed by fact kind including the predicate schema catalog.'
  - Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make.
  - Typed kb_query goals must be built from validated JSON input and never from caller-written Prolog.
  - Each linked predicate, property or subject fact in a kb_search answer must carry its typed claim and the kb_query call that asks about it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f1d1df7e3d100b9a5d9cec31ac68f76118198d4c009cf704c2c5d4b280f6503a
semantic_inventory:
  - claim_key: CLAIM-864657F88BEA7174
    claim_text: 'kb_query must answer typed questions about modeled facts: predicate facts selected by predicate name and order-free named arguments, strict property facts selected by subject key and property key, and facts listed by fact kind including the predicate schema catalog'
    role: normative
    span:
      start: 0
      end: 265
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-D8380B9B3A13AC50
    claim_text: Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make
    role: normative
    span:
      start: 267
      end: 514
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-2F5C790FBAC7D572
    claim_text: Typed kb_query goals must be built from validated JSON input and never from caller-written Prolog
    role: normative
    span:
      start: 516
      end: 613
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-1C1A8782A49CDAB5
    claim_text: Each linked predicate, property or subject fact in a kb_search answer must carry its typed claim and the kb_query call that asks about it
    role: normative
    span:
      start: 615
      end: 752
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-864657F88BEA7174
  - CLAIM-D8380B9B3A13AC50
  - CLAIM-2F5C790FBAC7D572
  - CLAIM-1C1A8782A49CDAB5
origin:
  kind: agent
  recorded_at: '2026-10-11T14:55:13.182Z'
id: REQ-kibi-query-fact-filters
type: req
---
# kb_query answers typed questions about modeled facts and names the next call

kb_query must answer typed questions about modeled facts: predicate facts selected by predicate name and order-free named arguments, strict property facts selected by subject key and property key, and facts listed by fact kind including the predicate schema catalog. Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make. Typed kb_query goals must be built from validated JSON input and never from caller-written Prolog. Each linked predicate, property or subject fact in a kb_search answer must carry its typed claim and the kb_query call that asks about it.

## Rationale

Agents searching prose for "what may an admin do" or "how many roles does alice have" read every matching requirement; the typed facts behind those requirements already hold the answer. Folding the typed query into kb_query (named where arguments, a schema catalog, suggestions and a next call on every answer) keeps the tool count unchanged and lets an agent ask precisely without knowing the predicate vocabulary or any Prolog.