---
title: The maximum proof receipt age shall be 604800 seconds
status: active
fact_kind: property_value
subject_key: kibi.proof.receipts
claim_key: CLAIM-B7AF26BF0F918815
claim_text: The maximum proof receipt age shall be 604800 seconds
text_ref: REQ-kibi-proof-receipt-max-age
property_key: max_receipt_age_seconds
operator: eq
value_type: int
value_int: 604800
origin:
  kind: agent
  recorded_at: '2026-10-28T10:12:07.522Z'
id: FACT-proof-receipt-max-age
type: fact
---
PROOF_RECEIPT_MAX_AGE_SECONDS in packages/cli/src/public/proof-receipt.ts is the age after which a passing receipt no longer proves its requirement. REQ-kibi-fresh-verification-receipts-v2 says a receipt must be no older than seven days; this requirement states the limit as a number so it is proved against the constant.