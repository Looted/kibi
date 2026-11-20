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
    receipt_id: PR-c3d7f4127d488fb57592eeaf
    test_id: TEST-proof-fingerprint-part-names
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 487fa67d157d1a892b57cbfc92dcb5bb7f3a1d48639c843d7a9d8c4ccbc8c404
    binding_hash: bdd0f5ecf8f80f4db465ac1963b12b69371ffb489763243f1d19f031e3c57824
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