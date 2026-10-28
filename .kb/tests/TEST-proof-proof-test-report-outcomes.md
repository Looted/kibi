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
    receipt_id: PR-27a26cb407f07b11a6566d38
    test_id: TEST-proof-proof-test-report-outcomes
    scope: unit
    outcome: passed
    code_snapshot: ebc106e5d7924a9ee2a860dfc5601c8f8311531c6d560d6647b330d4db83fd82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:09:52.958Z'
    finished_at: '2026-10-28T11:09:53.076Z'
    artifact_digest: 5112e308190699e654207cf16a655f9ac02016767b715a14a207519647a17c2a
    contract_hash: 3eed387257d41202fffe288fd281956fe3e9636cb52b4820bbb28f224181cf2b
    binding_hash: ba882354e76fc8a7869aa88d82749cff6c16ee2b548311a8ed0582890d6c16a8
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