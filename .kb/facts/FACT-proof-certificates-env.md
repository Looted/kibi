---
title: The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES
status: active
fact_kind: property_value
subject_key: kibi.proof.code_certificates
claim_key: CLAIM-814D7EBFC0615F2A
claim_text: The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES
text_ref: REQ-kibi-code-certificate-settings
property_key: certificates_env
operator: eq
value_type: string
value_string: KIBI_PROOF_CERTIFICATES
origin:
  kind: agent
  recorded_at: '2026-10-28T20:37:14.631Z'
id: FACT-proof-certificates-env
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.