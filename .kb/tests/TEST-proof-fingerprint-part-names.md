---
title: An execution fingerprint part shall be contract, integration, command, bindings or producer, by an exhaustive proof
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
    - symbol_id: SYM-proof-fingerprint-part-names
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-fingerprint-component-names
  proves:
    - CLAIM-33F263FA86E31124
origin:
  kind: agent
  recorded_at: '2026-10-28T21:19:50.992Z'
id: TEST-proof-fingerprint-part-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8978fb67b1bc376e5e960abd
    test_id: TEST-proof-fingerprint-part-names
    scope: unit
    outcome: passed
    code_snapshot: 92602f270b7e88628c8037c45b6dfb5e60e0a0c0cc654a810f9bc19c706cde7c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T21:22:28.820Z'
    finished_at: '2026-10-28T21:22:29.006Z'
    artifact_digest: 27aa7d9f0176f100fe592bfa2f80b9e6d4b5dc559d9bdb0b7851b717239bf882
    contract_hash: 487fa67d157d1a892b57cbfc92dcb5bb7f3a1d48639c843d7a9d8c4ccbc8c404
    binding_hash: 0854d198d32fc2329aa2fc90ea93f1a34a6cb53f8d3b4db919753b734e2da0f5
    fingerprint: 128f9341da0c4315ddd50d74f5a431227d695f09911ab9c7089798cb76981fb8
    fingerprint_components:
      contract: 487fa67d157d1a892b57cbfc92dcb5bb7f3a1d48639c843d7a9d8c4ccbc8c404
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
      - symbol_id: SYM-proof-fingerprint-part-names
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
      test_id: TEST-proof-fingerprint-part-names
      domain:
        symbol_id: SYM-fingerprint-component-names
        members:
          - contract
          - integration
          - command
          - bindings
          - producer
      results:
        - member: contract
          outcome: passed
        - member: integration
          outcome: passed
        - member: command
          outcome: passed
        - member: bindings
          outcome: passed
        - member: producer
          outcome: passed
    certificate_digest: 1c130d8ea0f0da6ae2d35d6d948e4556ea9812fb172734f2da42ae58f3626b88
    claim_bindings:
      - claim_key: CLAIM-33F263FA86E31124
        requirement_id: REQ-kibi-proof-receipt-format
        fact_id: FACT-fingerprint-part-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - bindings
            - command
            - contract
            - integration
            - producer
---
Proves that an execution fingerprint part shall be contract, integration, command, bindings or producer, against the code Kibi reads at ingest.