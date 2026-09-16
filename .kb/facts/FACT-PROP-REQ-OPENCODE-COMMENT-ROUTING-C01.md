---
title: The OpenCode plugin should detect long explanatory comments in code files and pr
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_opencode_comment_routing
property_key: clause_01_the_opencode_plugin_should_detect_long_explanato
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_opencode_comment_routing.clause_01_the_opencode_plugin_should_detect_long_explanato.eq.true
claim_key: CLAIM-B8B7611ACC73E37C
claim_text: 'The OpenCode plugin should detect long explanatory comments in code files and provide specific guidance for routing durable knowledge to appropriate Kibi entity types (FACT, ADR, REQ, SCEN, TEST) instead of inline code comments.\n\n\n**Multi-language comment extraction**: Support JavaScript/TypeScript (`//`, `/* */`, `/** */`) and Python (`#` blocks, true docstrings).\n\n**Durable knowledge detection**: Extract comment blocks that cross `guidance.commentDetection.minLines` threshold and contain prose suitable for Kibi artifacts.\n\n**Smart filtering for Python**: Analyze contiguous `#` comment blocks and true docstrings (module, class, function level)'
id: FACT-PROP-REQ-OPENCODE-COMMENT-ROUTING-C01
type: fact
---
