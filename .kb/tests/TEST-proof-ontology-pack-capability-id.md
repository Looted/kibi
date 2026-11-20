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
    receipt_id: PR-d7c9aa368d41a89cfd963a83
    test_id: TEST-proof-ontology-pack-capability-id
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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