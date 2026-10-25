---
title: A certificate proves only the requirement claims Kibi derives its obligation from
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - proof
  - certificate
  - evidence-levels
semantic_text: A certificate-kind proof contract must name the requirement claims it proves in proves. A claim binding must be one of derived, attested or rejected. Kibi must record a derived binding only when the certificate establishes the obligation Kibi derives from the claim's grounding fact. Kibi must record an attested binding for a named claim whose grounding fact has no derivation. Kibi must count a claim as proved only through a derived binding with code scope from a fresh certificate that re-checks. Kibi coverage must report a requirement as proved only when every applicable claim of it is proved. Kibi check must fail a certificate-kind proof contract that names no claims or names a claim its kind cannot prove.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8aa8ff4e7195ea4a32f910b6ba0f142b7143c515eb2cf91cb9e749e36944825e
semantic_inventory:
  - claim_key: CLAIM-0A37C19B4758B962
    claim_text: A certificate-kind proof contract must name the requirement claims it proves in proves
    role: normative
    status: modeled
    span:
      start: 0
      end: 86
  - claim_key: CLAIM-B5DC77B02767FF31
    claim_text: A claim binding must be one of derived, attested or rejected
    role: normative
    status: modeled
    span:
      start: 88
      end: 148
  - claim_key: CLAIM-5D8C5C04AFC28976
    claim_text: Kibi must record a derived binding only when the certificate establishes the obligation Kibi derives from the claim's grounding fact
    role: normative
    status: modeled
    span:
      start: 150
      end: 282
  - claim_key: CLAIM-01E812897106387E
    claim_text: Kibi must record an attested binding for a named claim whose grounding fact has no derivation
    role: normative
    status: modeled
    span:
      start: 284
      end: 377
  - claim_key: CLAIM-71A20569BCBF4363
    claim_text: Kibi must count a claim as proved only through a derived binding with code scope from a fresh certificate that re-checks
    role: normative
    status: modeled
    span:
      start: 379
      end: 499
  - claim_key: CLAIM-DD5C958EB6BA81B1
    claim_text: Kibi coverage must report a requirement as proved only when every applicable claim of it is proved
    role: normative
    status: modeled
    span:
      start: 501
      end: 599
  - claim_key: CLAIM-AFAB47EDE34509C5
    claim_text: Kibi check must fail a certificate-kind proof contract that names no claims or names a claim its kind cannot prove
    role: normative
    status: modeled
    span:
      start: 601
      end: 715
logic_claims:
  - CLAIM-0A37C19B4758B962
  - CLAIM-B5DC77B02767FF31
  - CLAIM-5D8C5C04AFC28976
  - CLAIM-01E812897106387E
  - CLAIM-71A20569BCBF4363
  - CLAIM-DD5C958EB6BA81B1
  - CLAIM-AFAB47EDE34509C5
origin:
  kind: agent
  recorded_at: '2026-10-25T18:21:09.906Z'
id: REQ-kibi-claim-bound-proofs
type: req
---
A certificate-kind proof contract must name the requirement claims it proves in proves. A claim binding must be one of derived, attested or rejected. Kibi must record a derived binding only when the certificate establishes the obligation Kibi derives from the claim's grounding fact. Kibi must record an attested binding for a named claim whose grounding fact has no derivation. Kibi must count a claim as proved only through a derived binding with code scope from a fresh certificate that re-checks. Kibi coverage must report a requirement as proved only when every applicable claim of it is proved. Kibi check must fail a certificate-kind proof contract that names no claims or names a claim its kind cannot prove.

## Context

Certificate proof kinds made proved reachable, but a certificate was checked against its domain, not against what the requirement says, so a requirement with several claims read as proved when one certificate per scenario re-checked, even if that certificate spoke to none of its claims. Kibi's own knowledge base showed it: every certificate test proved a domain while the requirement claims it linked to were boolean placeholders. Proved must mean that the requirement's own claims were established. A certificate contract now names the claims it proves, Kibi derives from each claim's grounding fact what the certificate has to establish (a set fact for exhaustive and typecheck, a numeric fact for arithmetic and smt), and a claim it cannot derive is only attested and never counts as proved. Arithmetic proved only from the knowledge base's facts shows that the facts entail the claim, not that the code follows them, so it stays tested unless the value is read from the code. Schema 12 makes a certificate contract without proves a blocking finding, and the migration pins proves where only one claim fits.

## Source

Asking why proved falls short: "proved still can't say which claims a proof covers, which your docs already state as a limit." Approving the design: "Please implement the plan."
