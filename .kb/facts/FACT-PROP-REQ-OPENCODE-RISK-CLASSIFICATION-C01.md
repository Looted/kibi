---
title: 'Every proposed edit or action must be classified to determine enforcement level:'
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_opencode_risk_classification
property_key: clause_01_every_proposed_edit_or_action_must_be_classified
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_opencode_risk_classification.clause_01_every_proposed_edit_or_action_must_be_classified.eq.true
claim_key: CLAIM-093542C105C70A84
claim_text: 'Every proposed edit or action must be classified to determine enforcement level:\n\n`safe_docs_only`: Edits to non-KB documentation.\n`safe_test_only`: Edits to tests only.\n`kb_doc_structural`: Edits to KB entity frontmatter or relationships.\n`req_policy_candidate`: New requirements that may need policy alignment.\n`behavior_candidate`: Code changes requiring traceability.\n`traceability_candidate`: Symbol changes missing requirement links.\n`manual_kb_edit`: Direct edits to `.kb/**` internal files (maximum warning)'
id: FACT-PROP-REQ-OPENCODE-RISK-CLASSIFICATION-C01
type: fact
---
