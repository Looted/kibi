---
title: A staged impact diagnostic shall be kibi_impact_evidence_missing or symbols_manifest_stale, by an exhaustive proof
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
    - symbol_id: SYM-proof-impact-diagnostic-ids
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-KIBI-IMPACT-DIAGNOSTIC-IDS
  proves:
    - CLAIM-F99938945F5E84C3
origin:
  kind: agent
  recorded_at: '2026-10-28T18:56:52.625Z'
id: TEST-proof-impact-diagnostic-ids
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-114a869a58a148f92040e8cb
    test_id: TEST-proof-impact-diagnostic-ids
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 74e265cea935bde3237a3d6ca9653c094fddad171be6425eb145a847c52135fc
    binding_hash: f2f5e06df983c5a148f1aff86342dff12129b030db642aa4ffe05fa86106e23b
    fingerprint: f37c5b4c7e7986880f61b861f6733aa21989c85d8eed542e33e36ad48672af72
    fingerprint_components:
      contract: 74e265cea935bde3237a3d6ca9653c094fddad171be6425eb145a847c52135fc
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
      - symbol_id: SYM-proof-impact-diagnostic-ids
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
      test_id: TEST-proof-impact-diagnostic-ids
      domain:
        symbol_id: SYM-KIBI-IMPACT-DIAGNOSTIC-IDS
        members:
          - kibi_impact_evidence_missing
          - symbols_manifest_stale
      results:
        - member: kibi_impact_evidence_missing
          outcome: passed
        - member: symbols_manifest_stale
          outcome: passed
    certificate_digest: ce0324e8d842f6a22dafae3dbb9a8e5970ddff5ea63855efc98f000f2474e416
    claim_bindings:
      - claim_key: CLAIM-F99938945F5E84C3
        requirement_id: REQ-staged-impact-identifiers
        fact_id: FACT-impact-diagnostic-ids
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kibi_impact_evidence_missing
            - symbols_manifest_stale
---
Proves that a staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale, against the code Kibi reads at ingest.