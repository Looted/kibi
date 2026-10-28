---
title: A proof run attempts status shall be complete or unavailable, by an exhaustive proof
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
    - symbol_id: SYM-proof-attempts-status
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-attempts-status-2
  proves:
    - CLAIM-90AD356D3D051F57
origin:
  kind: agent
  recorded_at: '2026-10-28T17:48:52.175Z'
id: TEST-proof-attempts-status
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a788d2113a589910026a421d
    test_id: TEST-proof-attempts-status
    scope: unit
    outcome: passed
    code_snapshot: 17256581582f43d83f66f4d6a118fecad7fcd8180df991d47ca9887713e21e82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:52:23.471Z'
    finished_at: '2026-10-28T17:52:23.694Z'
    artifact_digest: f4b9cb7cc363d98a2f16e38481a7830e41e28648ad778688c94d1b52059ccb6f
    contract_hash: 4501b5ecd381730129d9853999a73faacda36c70d632ce94ed00a9788f8362a4
    binding_hash: 49e8167d2c852ccdc10ac3955860304241d3acb02413c53cb828e9d5dcaf1cf0
    fingerprint: 163d8f2229e3523df50814ccc1ab56c4e661d4c935e9112c0cb1e4ac9225ec13
    fingerprint_components:
      contract: 4501b5ecd381730129d9853999a73faacda36c70d632ce94ed00a9788f8362a4
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
      - symbol_id: SYM-proof-attempts-status
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
      test_id: TEST-proof-attempts-status
      domain:
        symbol_id: SYM-attempts-status-2
        members:
          - complete
          - unavailable
      results:
        - member: complete
          outcome: passed
        - member: unavailable
          outcome: passed
    certificate_digest: e800e08f82f58060c6104aa514992ec9b8c22f454238d5bb8f42fdad58270de5
    claim_bindings:
      - claim_key: CLAIM-90AD356D3D051F57
        requirement_id: REQ-kibi-proof-run-vocabulary
        fact_id: FACT-attempts-status
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - complete
            - unavailable
---
Proves that a proof run attempts status shall be complete or unavailable, against the code Kibi reads at ingest.