---
title: A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted, by an exhaustive proof
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
    - symbol_id: SYM-proof-proof-test-report-outcomes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-proof-test-report-outcomes
  proves:
    - CLAIM-C11CA176D75C6530
origin:
  kind: agent
  recorded_at: '2026-10-28T11:08:00.855Z'
id: TEST-proof-proof-test-report-outcomes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-69cd4cd85bfd4e3d476dce5d
    test_id: TEST-proof-proof-test-report-outcomes
    scope: unit
    outcome: passed
    code_snapshot: 0e92ecb6e2415cb6b44cd4648abe5bf8c9c235c18d9f56844e07e29be087804d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:21:23.092Z'
    finished_at: '2026-11-16T11:22:49.884Z'
    artifact_digest: 4c5ff880d8b0e5e45dca5d0803c0c793347804c85ecfaa631ec1e84c2fe84bfa
    contract_hash: 3eed387257d41202fffe288fd281956fe3e9636cb52b4820bbb28f224181cf2b
    binding_hash: 659e7249fd2aff36e5ddd77340ce2dfab67aec8ac5fe6914f3f4eb475935a229
    fingerprint: 25393ef0e95a304844c457b58a0847cd23e155b146df6b59e969f3bb0515bc51
    fingerprint_components:
      contract: 3eed387257d41202fffe288fd281956fe3e9636cb52b4820bbb28f224181cf2b
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
      - symbol_id: SYM-proof-proof-test-report-outcomes
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
      test_id: TEST-proof-proof-test-report-outcomes
      domain:
        symbol_id: SYM-const-proof-test-report-outcomes
        members:
          - passed
          - failed
          - timed_out
          - errored
          - interrupted
      results:
        - member: passed
          outcome: passed
        - member: failed
          outcome: passed
        - member: timed_out
          outcome: passed
        - member: errored
          outcome: passed
        - member: interrupted
          outcome: passed
    certificate_digest: c264cfdc72c86efcc2cab1d054a01406e835628fd72ff58d3f498116fcf40c27
    claim_bindings:
      - claim_key: CLAIM-C11CA176D75C6530
        requirement_id: REQ-kibi-proof-step-settings
        fact_id: FACT-proof-test-report-outcomes
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - errored
            - failed
            - interrupted
            - passed
            - timed_out
---
Proves that a per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted, against the code Kibi reads at ingest.