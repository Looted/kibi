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
    receipt_id: PR-892a73a250d6a413f8028585
    test_id: TEST-proof-behavioral-symbol-kinds
    scope: unit
    outcome: passed
    code_snapshot: 5434da306c269b06f3ab3332686aeca47fd3a0e8a998befaf06388d5c53900c8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:18:20.700Z'
    finished_at: '2026-11-16T12:18:37.567Z'
    artifact_digest: da962867df0788e1cd125354a3c527b16bacdea069bf1f6209e0c1e3d6617377
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