---
title: The ontology pack capability id shall be kibi.ontology-pack.v1, by a regex proof
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
    - symbol_id: SYM-proof-ontology-pack-capability-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cap-plugin-ontology-pack-capability-id-d76dee06
  proves:
    - CLAIM-D3553D92CAA0ACD7
origin:
  kind: agent
  recorded_at: '2026-10-28T10:49:13.941Z'
id: TEST-proof-ontology-pack-capability-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4d23f05c5041c96664e6d858
    test_id: TEST-proof-ontology-pack-capability-id
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: c8faa19c95435f8ba1e1afabca73edb303bb151e8ec456617bc6736252d4770c
    binding_hash: e0705d96e80b5a51c354ad4730a4fd6493906b3232ad5415bab0526e78ad1cf7
    fingerprint: b9e55b52780772c14dc9aece217df9e1b741186d4e73bf219bba307013cb25f8
    fingerprint_components:
      contract: c8faa19c95435f8ba1e1afabca73edb303bb151e8ec456617bc6736252d4770c
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
      - symbol_id: SYM-proof-ontology-pack-capability-id
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
      test_id: TEST-proof-ontology-pack-capability-id
      pattern:
        symbol_id: SYM-cap-plugin-ontology-pack-capability-id-d76dee06
        type: string
        value: kibi.ontology-pack.v1
    certificate_digest: ba055182bbf9d96e5ad96587c927f520c382fda93f71326973ebf6b5026391d8
    claim_bindings:
      - claim_key: CLAIM-D3553D92CAA0ACD7
        requirement_id: REQ-capability-plugin-protocol-identifiers
        fact_id: FACT-ontology-pack-capability-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.ontology-pack.v1
---
Proves that the ontology pack capability id shall be kibi.ontology-pack.v1, against the code Kibi reads at ingest.