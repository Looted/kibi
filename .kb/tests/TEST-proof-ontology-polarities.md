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
    receipt_id: PR-0bb33e415d9fadb4b1e364ff
    test_id: TEST-proof-ontology-polarities
    scope: unit
    outcome: passed
    code_snapshot: ff8e5279c85a1d8327a39367bae1bbbfaf7995ec824dc7f7b0c782d4598c1f1b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:32:20.297Z'
    finished_at: '2026-10-29T10:32:20.489Z'
    artifact_digest: cb9f41bd0a2ad26ef566edb73ee62e5932d34c20ca7f59a6e537beed6a58bf2f
    contract_hash: cec33b25f955f43f804ab6ad7c04ef00ed19f95f0283933830d214f5302ed3e0
    binding_hash: 703eaca6336ca56f4cac1a702bc8778a07a397ed190bb9c762be26b0af9d79eb
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