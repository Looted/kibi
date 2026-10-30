---
title: A decision firmness shall be firm, default or exploratory, by an exhaustive proof
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
    - symbol_id: SYM-proof-firmness-values
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-firmness-values
  proves:
    - CLAIM-E402B31AC2511090
origin:
  kind: agent
  recorded_at: '2026-10-28T20:51:13.390Z'
id: TEST-proof-firmness-values
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f718836fc69133d4efd4dfb0
    test_id: TEST-proof-firmness-values
    scope: unit
    outcome: passed
    code_snapshot: ab7d4036f983391bf947f09fb5fa64fead9b5038d6464ae4f43777b833b0d785
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:51:54.527Z'
    finished_at: '2026-10-28T20:51:54.658Z'
    artifact_digest: f1dba57dda1e3792814db2311d66ba166a0ffdcb645222645c6ff89a7559abb8
    contract_hash: 13e495720c0522563b703c39338eed96289fcb9a39555d919d48ee5152f479c3
    binding_hash: ba02ed34ea8a0d3b876094062b755aaf64b525ee263af8a8df90ec29bd5e2cf3
    fingerprint: dfa69210878579a08e3f7827c3de7b60d7d74171f83bd6449dcbdc582c85d731
    fingerprint_components:
      contract: 13e495720c0522563b703c39338eed96289fcb9a39555d919d48ee5152f479c3
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
      - symbol_id: SYM-proof-firmness-values
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
      test_id: TEST-proof-firmness-values
      domain:
        symbol_id: SYM-const-firmness-values
        members:
          - firm
          - default
          - exploratory
      results:
        - member: firm
          outcome: passed
        - member: default
          outcome: passed
        - member: exploratory
          outcome: passed
    certificate_digest: 3b2a14325aebb9b04ee3a77ff1babc41690af98e2ad80906877757f3b4cc5b39
    claim_bindings:
      - claim_key: CLAIM-E402B31AC2511090
        requirement_id: REQ-kb-firmness-values
        fact_id: FACT-firmness-values
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - default
            - exploratory
            - firm
---
Proves that a decision firmness shall be firm, default or exploratory, against the code Kibi reads at ingest.