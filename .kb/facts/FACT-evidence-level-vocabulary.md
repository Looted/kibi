---
title: Kibi evidence levels shall be proved, tested, asserted and unverified
status: active
fact_kind: property_value
subject_key: kibi.evidence_levels.vocabulary
claim_key: CLAIM-ABCB82718BC90BF2
claim_text: Kibi evidence levels shall be proved, tested, asserted and unverified
text_ref: REQ-kibi-evidence-level-vocabulary
property_key: levels
operator: eq
value_type: set
value_set:
  - proved
  - tested
  - asserted
  - unverified
origin:
  kind: agent
  recorded_at: '2026-10-28T10:06:00.603Z'
id: FACT-evidence-level-vocabulary
type: fact
---
EVIDENCE_LEVELS in packages/cli/src/public/evidence-levels.ts is the closed list of evidence levels coverage, report and signoff use. REQ-kibi-evidence-levels says when each level applies; this requirement states the list itself so it is proved against the code.