---
title: Certificate proof kinds earn proved evidence only when Kibi re-checks the certificate
status: open
required_evidence: tested
priority: should
tags:
  - proof
  - certificate
  - evidence-levels
firmness: default
semantic_text: A proof contract kind must be one of e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A proof contract without a kind must count as e2e. Kibi must record a receipt as proved only when its contract kind is exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source and the certificate the run left re-checks. Kibi must reject an exhaustive or typecheck certificate whose proof does not import its domain from the domain_source symbol. Kibi must reject an arithmetic certificate whose assumptions admit no value or do not entail its claim. Kibi must reject an smt certificate unless the named solver answers unsat when Kibi re-runs the query. Kibi coverage must report a tested requirement as proved only when certificates prove every applicable claim of it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8819290f52b3c1415a7df9b2783c1d9d1ae5e75ab471bb2fa54be63ea5473399
semantic_inventory:
  - claim_key: CLAIM-AEDC5DE05A243DB4
    claim_text: A proof contract kind must be one of e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source
    role: normative
    status: modeled
    span:
      start: 0
      end: 137
  - claim_key: CLAIM-5961DA4504D30523
    claim_text: A proof contract without a kind must count as e2e
    role: normative
    status: modeled
    span:
      start: 139
      end: 188
  - claim_key: CLAIM-CE2EA1EA90BC9595
    claim_text: Kibi must record a receipt as proved only when its contract kind is exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source and the certificate the run left re-checks
    role: normative
    status: modeled
    span:
      start: 190
      end: 377
  - claim_key: CLAIM-0FCC0A21849A9EC4
    claim_text: Kibi must reject an exhaustive or typecheck certificate whose proof does not import its domain from the domain_source symbol
    role: normative
    status: modeled
    span:
      start: 379
      end: 503
  - claim_key: CLAIM-B3898990A43E743F
    claim_text: Kibi must reject an arithmetic certificate whose assumptions admit no value or do not entail its claim
    role: normative
    status: modeled
    span:
      start: 505
      end: 607
  - claim_key: CLAIM-0142A9B66D65F28F
    claim_text: Kibi must reject an smt certificate unless the named solver answers unsat when Kibi re-runs the query
    role: exception
    status: modeled
    span:
      start: 609
      end: 710
  - claim_key: CLAIM-83222148D2E46CC8
    claim_text: Kibi coverage must report a tested requirement as proved only when certificates prove every applicable claim of it
    role: normative
    status: modeled
    span:
      start: 712
      end: 826
logic_claims:
  - CLAIM-AEDC5DE05A243DB4
  - CLAIM-5961DA4504D30523
  - CLAIM-CE2EA1EA90BC9595
  - CLAIM-0FCC0A21849A9EC4
  - CLAIM-B3898990A43E743F
  - CLAIM-0142A9B66D65F28F
  - CLAIM-83222148D2E46CC8
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:50.325Z'
id: REQ-kibi-code-proof-kinds
type: req
---
A proof contract kind must be one of e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A proof contract without a kind must count as e2e. Kibi must record a receipt as proved only when its contract kind is exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source and the certificate the run left re-checks. Kibi must reject an exhaustive or typecheck certificate whose proof does not import its domain from the domain_source symbol. Kibi must reject an arithmetic certificate whose assumptions admit no value or do not entail its claim. Kibi must reject an smt certificate unless the named solver answers unsat when Kibi re-runs the query. Kibi coverage must report a tested requirement as proved only when certificates prove every applicable claim of it.

## Context

Until now the strongest evidence Kibi could report was tested: passing end-to-end receipts for every linked scenario. A test samples cases, so a requirement over a finite domain (every entity type, every evidence level, every proof kind) could be covered completely and still read as tested. A proof contract now names its kind. Runner kinds (e2e, example, property) sample cases and support tested. Certificate kinds (exhaustive, typecheck, arithmetic, smt) leave a kibi.code-certificate.v1 that Kibi re-checks at ingest and again whenever it reports evidence, so a test that claims to cover every case cannot earn proved by saying so. An exhaustive or typecheck proof must import its domain from the symbol the contract names, because a hand-listed domain goes stale silently when the code grows. Arithmetic claims are decided exactly by the interval reasoning Kibi already uses for contradictions, and SMT certificates are re-run on the named solver. A requirement reads as proved only on top of tested end-to-end evidence, so a certificate strengthens the evidence and never replaces the journey test.

## Source

Choosing the remaining formal-proof phases: "I'd like to do all the remaining phases."

## Why this changed

The rule, state_machine and regex kinds (REQ-kibi-non-numeric-proof-kinds) and the source kind (REQ-kibi-source-proof-kinds) added four certificate kinds after this requirement was written. On 2026-10-27 its kind lists were updated to the eleven kinds the proof protocol accepts, eight of them certificate kinds, so the exhaustive proof over the protocol's kind list holds again.
