---
title: Code certificate version, extracts and limits
status: open
priority: must
firmness: firm
semantic_text: The code certificate version shall be kibi.code-certificate.v1. The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES. A reference extract shall be env, imports, calls, string_args, thrown or property. A proof table model shall hold at most 100000 rows.
semantic_clauses:
  - The code certificate version shall be kibi.code-certificate.v1.
  - The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES.
  - A reference extract shall be env, imports, calls, string_args, thrown or property.
  - A proof table model shall hold at most 100000 rows.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T20:37:17.021Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b88b11a5b7b02ef3b524362f6091a29b313e9ac99b6c35c594226d96d23ccba6
semantic_inventory:
  - claim_key: CLAIM-C2A64C5B65975AC4
    claim_text: The code certificate version shall be kibi.code-certificate.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 62
  - claim_key: CLAIM-814D7EBFC0615F2A
    claim_text: The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES
    role: normative
    status: modeled
    span:
      start: 64
      end: 140
  - claim_key: CLAIM-BDF0CF219768BC5D
    claim_text: A reference extract shall be env, imports, calls, string_args, thrown or property
    role: normative
    status: modeled
    span:
      start: 142
      end: 223
  - claim_key: CLAIM-5D32157CFE2F143E
    claim_text: A proof table model shall hold at most 100000 rows
    role: normative
    status: modeled
    span:
      start: 225
      end: 275
logic_claims:
  - CLAIM-C2A64C5B65975AC4
  - CLAIM-814D7EBFC0615F2A
  - CLAIM-BDF0CF219768BC5D
  - CLAIM-5D32157CFE2F143E
id: REQ-kibi-code-certificate-settings
type: req
---
The code certificate version shall be kibi.code-certificate.v1. The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES. A reference extract shall be env, imports, calls, string_args, thrown or property. A proof table model shall hold at most 100000 rows.

## Context

REQ-kibi-code-proof-kinds proves claims with certificates Kibi re-runs against the code. A certificate carries a version, an environment variable controls certificates, a references source reads one of a closed list of extracts and a table model is cut at a row bound. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"