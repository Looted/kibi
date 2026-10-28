---
title: A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale, by an exhaustive proof
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
    - CLAIM-5DCC5375F28A93DF
origin:
  kind: agent
  recorded_at: '2026-10-28T18:56:52.625Z'
id: TEST-proof-impact-diagnostic-ids
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6a531749183bc9a64b8802fd
    test_id: TEST-proof-impact-diagnostic-ids
    scope: unit
    outcome: passed
    code_snapshot: 1525e26386be688f0153859837e8864169cd0c2608dba36204dcab4f0d708d54
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:00:21.415Z'
    finished_at: '2026-10-28T19:00:21.515Z'
    artifact_digest: 88d55403dc0ec383a649b8c9bf99389200cbc3ed5d0733284e91013121e53ab9
    contract_hash: 8cefa8273eb5b5c1a0f1294427239843c535d24abbc56f164686e3d2303cc784
    binding_hash: 05a2f3c294878771387e4fb9aae13f955b765e071866a6b0c0dbd04c702115c8
    fingerprint: 66d65627fbd82709c2f7ef7e7a09bb09e4f90173c1eccf84d71c405e4bd1da03
    fingerprint_components:
      contract: 8cefa8273eb5b5c1a0f1294427239843c535d24abbc56f164686e3d2303cc784
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
          - kibi_impact_override_missing_rationale
      results:
        - member: kibi_impact_evidence_missing
          outcome: passed
        - member: symbols_manifest_stale
          outcome: passed
        - member: kibi_impact_override_missing_rationale
          outcome: passed
    certificate_digest: c5b1995259f5b3a7a9cc3633db3687d63ab7b0cadaaa37cf7e9fd95a3b563055
    claim_bindings:
      - claim_key: CLAIM-5DCC5375F28A93DF
        requirement_id: REQ-staged-impact-identifiers
        fact_id: FACT-impact-diagnostic-ids
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kibi_impact_evidence_missing
            - kibi_impact_override_missing_rationale
            - symbols_manifest_stale
---
Proves that a staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale, against the code Kibi reads at ingest.