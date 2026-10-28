---
title: The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-proof-test-report-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-test-report-env
  proves:
    - CLAIM-9B373E83EA0B0ACA
origin:
  kind: agent
  recorded_at: '2026-10-28T11:07:13.796Z'
id: TEST-proof-proof-test-report-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-debc8c0d52b8ee4e27ad9314
    test_id: TEST-proof-proof-test-report-env
    scope: unit
    outcome: passed
    code_snapshot: ebc106e5d7924a9ee2a860dfc5601c8f8311531c6d560d6647b330d4db83fd82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:09:40.566Z'
    finished_at: '2026-10-28T11:09:40.701Z'
    artifact_digest: d60158dc84f07742d75b0e06ee4335e647b4292e65840828d86fe7855d2d26a7
    contract_hash: dcd09d73ccb08ce7577bbb3de4f5a970198b1b76ea6e8f35b3da298c26f02eb5
    binding_hash: f04dfb5bf63b66f846b38ababb57d885ada9093d7aca889c10a254da123f0257
    fingerprint: 6ed35af391939a590a3cf7a123dd5aa4c9a78aa2f0e44be6286aba38316e58a1
    fingerprint_components:
      contract: dcd09d73ccb08ce7577bbb3de4f5a970198b1b76ea6e8f35b3da298c26f02eb5
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
      - symbol_id: SYM-proof-proof-test-report-env
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-proof-test-report-env
      pattern:
        symbol_id: SYM-const-proof-test-report-env
        type: string
        value: KIBI_PROOF_TEST_REPORT
    certificate_digest: a35bdf93f2cbf6344a759d753a833a9103069bf6551aee8e5f80a86e1e688606
    claim_bindings:
      - claim_key: CLAIM-9B373E83EA0B0ACA
        requirement_id: REQ-kibi-proof-step-settings
        fact_id: FACT-proof-test-report-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_PROOF_TEST_REPORT
---
Proves that the per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT, against the code Kibi reads at ingest.