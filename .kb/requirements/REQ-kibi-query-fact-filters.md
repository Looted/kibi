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
semantic_text: 'kb_query must answer typed questions about modeled facts: predicate facts selected by predicate name and order-free named arguments, strict property facts selected by subject key and property key, and facts listed by fact kind including the predicate schema catalog. Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make. Typed kb_query goals must be built from validated JSON input and never from caller-written Prolog. Each linked predicate, property or subject fact in a kb_search answer must carry its typed claim, and the kb_query call that asks about it when the call sets fields to full.'
semantic_clauses:
  - 'kb_query must answer typed questions about modeled facts: predicate facts selected by predicate name and order-free named arguments, strict property facts selected by subject key and property key, and facts listed by fact kind including the predicate schema catalog.'
  - Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make.
  - Typed kb_query goals must be built from validated JSON input and never from caller-written Prolog.
  - Each linked predicate, property or subject fact in a kb_search answer must carry its typed claim, and the kb_query call that asks about it when the call sets fields to full.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 80acf312d728ab03616eec363102bd9c70d39d3a6e8734bcf3742029d3a369e1
semantic_inventory:
  - claim_key: CLAIM-864657F88BEA7174
    claim_text: 'kb_query must answer typed questions about modeled facts: predicate facts selected by predicate name and order-free named arguments, strict property facts selected by subject key and property key, and facts listed by fact kind including the predicate schema catalog'
    role: normative
    status: modeled
    span:
      start: 0
      end: 265
  - claim_key: CLAIM-D8380B9B3A13AC50
    claim_text: Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make
    role: normative
    status: modeled
    span:
      start: 267
      end: 514
  - claim_key: CLAIM-2F5C790FBAC7D572
    claim_text: Typed kb_query goals must be built from validated JSON input and never from caller-written Prolog
    role: normative
    status: modeled
    span:
      start: 516
      end: 613
  - claim_key: CLAIM-EBE72EBA8A50DE87
    claim_text: Each linked predicate, property or subject fact in a kb_search answer must carry its typed claim, and the kb_query call that asks about it when the call sets fields to full
    role: normative
    status: modeled
    span:
      start: 615
      end: 787
logic_claims:
  - CLAIM-864657F88BEA7174
  - CLAIM-D8380B9B3A13AC50
  - CLAIM-2F5C790FBAC7D572
  - CLAIM-EBE72EBA8A50DE87
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-10-11T14:55:13.182Z'
id: REQ-kibi-query-fact-filters
type: req
---
# kb_query answers typed questions about modeled facts and names the next call

kb_query must answer typed questions about modeled facts: predicate facts selected by predicate name and order-free named arguments, strict property facts selected by subject key and property key, and facts listed by fact kind including the predicate schema catalog. Every typed kb_query answer must return the matching fact rows and a factQuery block with the schema used, distinct value counts, the values that exist when nothing matched, warnings for undeclared argument names and the next kb_query call to make. Typed kb_query goals must be built from validated JSON input and never from caller-written Prolog. Each linked predicate, property or subject fact in a kb_search answer must carry its typed claim, and the kb_query call that asks about it when the call sets fields to full.

## Rationale

Agents searching prose for "what may an admin do" or "how many roles does alice have" read every matching requirement; the typed facts behind those requirements already hold the answer. Folding the typed query into kb_query (named where arguments, a schema catalog, suggestions and a next call on every answer) keeps the tool count unchanged and lets an agent ask precisely without knowing the predicate vocabulary or any Prolog.