---
title: The extracted symbol kinds that always need an implements link, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-behavioral-symbol-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: prolog
    file: packages/core/src/symbol_classification.pl
    functor: behavioral_kind/1
  proves:
    - CLAIM-90076AA08D1342F3
origin:
  kind: agent
  recorded_at: '2026-11-16T11:04:06.310Z'
id: TEST-proof-behavioral-symbol-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-aaf66855619f3f6946e7487f
    test_id: TEST-proof-behavioral-symbol-kinds
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 33c4c8db4dac46d7290312e3c32693b20657679774c9f0ebc6cb5871357fd620
    binding_hash: 7c2c22b1ab4edea9d9d7919b09ba58e4710f55a54ac37e3c93c14f0ab10cd617
    fingerprint: 1bb1c86369f905c4a2741664983f9b3eebe10364c9876719b9b032bed6a62edf
    fingerprint_components:
      contract: 33c4c8db4dac46d7290312e3c32693b20657679774c9f0ebc6cb5871357fd620
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
      - symbol_id: SYM-proof-behavioral-symbol-kinds
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-behavioral-symbol-kinds
      source:
        reader: prolog
        file: packages/core/src/symbol_classification.pl
        functor: behavioral_kind/1
      model:
        members:
          - accessor
          - class
          - function
          - method
          - property
        sequence:
          - function
          - class
          - method
          - property
          - accessor
    certificate_digest: ce33d98c4b8a0c18425d4ff718dce2a7d3a1e394cd397c2b1a72761340f4ab8d
    claim_bindings:
      - claim_key: CLAIM-90076AA08D1342F3
        requirement_id: REQ-behavioral-kinds-keep-implements
        fact_id: FACT-behavioral-symbol-kinds
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - accessor
            - class
            - function
            - method
            - property
          operator: eq
---
Proves that the extracted symbol kinds that always need an implements link shall be function, class, method, property and accessor, reading the behavioral_kind/1 facts Kibi's checks load.