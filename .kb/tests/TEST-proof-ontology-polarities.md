---
title: An ontology pack polarity shall be assert or deny, by an exhaustive proof
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
    - symbol_id: SYM-proof-ontology-polarities
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cap-plugin-ontology-polarities-1200e8a1
  proves:
    - CLAIM-29C261A1A9DA5FDB
origin:
  kind: agent
  recorded_at: '2026-10-29T10:29:49.099Z'
id: TEST-proof-ontology-polarities
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f83690d1cec9928f94178e5e
    test_id: TEST-proof-ontology-polarities
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: cec33b25f955f43f804ab6ad7c04ef00ed19f95f0283933830d214f5302ed3e0
    binding_hash: 5d39f82ccec16b5173bd1bd6f07613ad82561a28317bda69c8b10f6da48b4edb
    fingerprint: a7371013ad80ea4eadd077a893308b864904d3aa60ea4f7313464d35d1ed3466
    fingerprint_components:
      contract: cec33b25f955f43f804ab6ad7c04ef00ed19f95f0283933830d214f5302ed3e0
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
      - symbol_id: SYM-proof-ontology-polarities
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
      test_id: TEST-proof-ontology-polarities
      domain:
        symbol_id: SYM-cap-plugin-ontology-polarities-1200e8a1
        members:
          - assert
          - deny
      results:
        - member: assert
          outcome: passed
        - member: deny
          outcome: passed
    certificate_digest: e41e3a5af4d165a1eaf6f96fef4da8b8ba34981a8758aad6fad754789625efcc
    claim_bindings:
      - claim_key: CLAIM-29C261A1A9DA5FDB
        requirement_id: REQ-capability-plugin-vocabulary
        fact_id: FACT-ontology-polarities
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - assert
            - deny
---
Proves that an ontology pack polarity shall be assert or deny, against the code Kibi reads at ingest.