---
title: Coverage depth review skips proof-exempt requirements
status: active
fact_kind: property_value
subject_key: kibi.check.coverage_depth
property_key: proof_exempt_requirements_reported
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-B9C19B265E77019C
claim_text: 'A requirement marked proof_exempt with a reason must not be reported'
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-11, approving the wording fixes of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-11T17:45:00.000Z'
id: FACT-PROP-kibi-coverage-depth-quality-c02
type: fact
---
coverage_depth_review skips a requirement whose proof_exempt is true with a non-empty proof_exempt_reason, the same way the evidence floor does (packages/cli/src/public/impact/coverage-depth-quality.ts).
