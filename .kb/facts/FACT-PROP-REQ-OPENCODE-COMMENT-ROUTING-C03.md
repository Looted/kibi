---
title: Only medium/high-confidence suggestions trigger prompts.\n\n**Non-blocking behav
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_opencode_comment_routing
property_key: clause_03_only_medium_high_confidence_suggestions_trigger_
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_opencode_comment_routing.clause_03_only_medium_high_confidence_suggestions_trigger_.eq.true
claim_key: CLAIM-8ED771213571A72A
claim_text: 'Only medium/high-confidence suggestions trigger prompts.\n\n**Non-blocking behavior**: Analysis runs after `file.edited` events without blocking sync or other plugin operations.\n\n**Configurability**: Respect `guidance.commentDetection.enabled` and `guidance.commentDetection.minLines` settings.\n\n\nSaving a `.py` file with a long docstring triggers specific FACT/ADR/REQ routing guidance.\nSaving a `.ts` file with a long `//` comment block triggers appropriate guidance.\nShort/ordinary comments do not trigger guidance.\nRepeated saves of identical comments do not spam warnings.\nSync and targeted validation behavior remain unchanged'
id: FACT-PROP-REQ-OPENCODE-COMMENT-ROUTING-C03
type: fact
---
