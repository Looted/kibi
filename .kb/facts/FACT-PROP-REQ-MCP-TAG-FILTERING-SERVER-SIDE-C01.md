---
title: '`kb_query` already accepts a `tags` filter, but the MCP implementation currently'
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_mcp_tag_filtering_server_side
property_key: clause_01_kb_query_already_accepts_a_tags_filter_but_the_m
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_mcp_tag_filtering_server_side.clause_01_kb_query_already_accepts_a_tags_filter_but_the_m.eq.true
claim_key: CLAIM-82C857445E27017D
claim_text: '`kb_query` already accepts a `tags` filter, but the MCP implementation currently falls back to fetching entities and filtering them in JavaScript because tag list normalization is not yet reliable across stored formats.\n\n\nRestore server-side tag filtering in the Prolog query path once tag normalization is reliable.\nPreserve the current public semantics: matching any provided tag returns the entity.\nNormalize tag list representations consistently so server-side filtering behaves the same as the current JavaScript fallback.\nAvoid full-entity scans for tag-filtered queries when server-side filtering is available.\n\n\n`kb_query` with `tags` returns the same results before and after the server-side implementation change.\nMixed or legacy tag list formats no longer force JavaScript-side fallback.\nLarge knowledge bases do not require fetching every entity just to apply tag filters'
id: FACT-PROP-REQ-MCP-TAG-FILTERING-SERVER-SIDE-C01
type: fact
---
