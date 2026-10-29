---
title: A health report filter shall be all, proved, tested, attention, below_floor, pending_reproof, stale or contradiction, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-report-filter-names
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-report-filters
  proves:
    - CLAIM-9F74F3CE7D64FDC4
origin:
  kind: agent
  recorded_at: '2026-10-29T10:25:13.891Z'
id: TEST-proof-report-filter-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-febaf50a1376ef3f8a43a12d
    test_id: TEST-proof-report-filter-names
    scope: unit
    outcome: passed
    code_snapshot: 9a419971de9c6e154c01df120b9f70cdfb63d9847302bf2944c091e73ffe18b7
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:28:18.506Z'
    finished_at: '2026-10-29T10:28:18.697Z'
    artifact_digest: eb60c608d21198e8830c3204cd3a58d5b3d8d762f21a95f0f69fc9ec5f0e79ab
    contract_hash: 8e9d164a2ab4c9c00662583660981132c7123f85277d8f88a7a5c5f9095ff039
    binding_hash: 96429435cec6081ec0ae706eaa54a2324f27c9818ad5a8d385e952233e742833
    fingerprint: 8e6de29e9f410acd4d62915f7aba9d11f0d19eb8c53aca8b241e5150d1b842b6
    fingerprint_components:
      contract: 8e9d164a2ab4c9c00662583660981132c7123f85277d8f88a7a5c5f9095ff039
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-proof-report-filter-names
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-report-filter-names
      domain:
        symbol_id: SYM-cli-report-filters
        members:
          - all
          - proved
          - tested
          - attention
          - below_floor
          - pending_reproof
          - stale
          - contradiction
      results:
        - member: all
          outcome: passed
        - member: proved
          outcome: passed
        - member: tested
          outcome: passed
        - member: attention
          outcome: passed
        - member: below_floor
          outcome: passed
        - member: pending_reproof
          outcome: passed
        - member: stale
          outcome: passed
        - member: contradiction
          outcome: passed
    certificate_digest: 3a9f2f82d91329514ff755b5a0347da8d86de1ab9395f528fcefeacda69023fd
    claim_bindings:
      - claim_key: CLAIM-9F74F3CE7D64FDC4
        requirement_id: REQ-kibi-report-filters-and-gates
        fact_id: FACT-report-filter-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - all
            - attention
            - below_floor
            - contradiction
            - pending_reproof
            - proved
            - stale
            - tested
---
Proves that a health report filter shall be all, proved, tested, attention, below_floor, pending_reproof, stale or contradiction, against the code Kibi reads at ingest.