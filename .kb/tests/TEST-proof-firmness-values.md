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
    receipt_id: PR-f7ead4ecb59e0d35def7589f
    test_id: TEST-proof-firmness-values
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 13e495720c0522563b703c39338eed96289fcb9a39555d919d48ee5152f479c3
    binding_hash: e3fb6fcc1c19ee7810c3a7ca43a57f9e6bd047975b1abc032ebe82d9fe14eb01
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