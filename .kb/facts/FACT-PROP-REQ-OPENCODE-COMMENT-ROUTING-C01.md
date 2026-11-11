---
title: opencode.kibi_plugin clause 1
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: opencode.kibi_plugin
property_key: routes_long_comments_to_entities
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_opencode_comment_routing.routes_long_comments_to_entities.eq.true
claim_key: CLAIM-85B6728384E0847D
claim_text: The OpenCode plugin must detect long explanatory comments in code files and guide the agent to route durable knowledge to the matching Kibi entity type (FACT, ADR, REQ, SCEN or TEST) instead of an inline comment
id: FACT-PROP-REQ-OPENCODE-COMMENT-ROUTING-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
