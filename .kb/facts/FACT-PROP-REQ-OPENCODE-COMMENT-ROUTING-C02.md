---
title: Ignore arbitrary triple-quoted strings not in docstring position.\n\n**Classific
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_opencode_comment_routing
property_key: clause_02_ignore_arbitrary_triple_quoted_strings_not_in_do
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_opencode_comment_routing.clause_02_ignore_arbitrary_triple_quoted_strings_not_in_do.eq.true
claim_key: CLAIM-C9C15A701A09623F
claim_text: 'Ignore arbitrary triple-quoted strings not in docstring position.\n\n**Classification**: Use `knowledge-classifier.ts` to categorize extracted comments as FACT (invariants/defaults/limits), ADR (decisions/tradeoffs), REQ (behavior/capabilities), SCEN (flows), or TEST (verification).\n\n**Specific routing guidance**: Inject targeted prompts based on classification:\nFACT: \"This looks like a domain invariant; route to a FACT via Kibi.\"\nADR: \"This looks like decision rationale; route to an ADR.\"\nREQ: \"This looks like behavior intent; route to a REQ.\"\n\n**Dedupe and noise control**: Track seen comments by fingerprint to avoid repeated guidance for the same content'
id: FACT-PROP-REQ-OPENCODE-COMMENT-ROUTING-C02
type: fact
---
