---
title: An entity origin kind shall be human, agent, migration or import, by an exhaustive proof
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
    - symbol_id: SYM-proof-entity-origin-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-entity-origin-kinds
  proves:
    - CLAIM-A508A2A195ECC6DD
origin:
  kind: agent
  recorded_at: '2026-10-28T11:00:53.092Z'
id: TEST-proof-entity-origin-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4317762081af6402d902321d
    test_id: TEST-proof-entity-origin-kinds
    scope: unit
    outcome: passed
    code_snapshot: 3fc412bb59139c2d3e14abfb073b0c0c51d8325614126c3ecb530445537bd05b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:02:07.946Z'
    finished_at: '2026-10-28T11:02:08.064Z'
    artifact_digest: cde1aa7e3e7409b769734e866d712c4768498cec966c5919b6911eea10cf6157
    contract_hash: 495af3741db6cece0137ddf2eaf263cf885cd7667b8e666f3a048c13e5e4b90d
    binding_hash: 76aeadafc62c3e7c6f2d7bbf0db1fc5ea2bf0e4ad9f0e58eb4cce5798409f7b1
    fingerprint: e85cd88661da03cd0f58758c32543b47d0989e136e936d3bbdd30ae8d3ee42b9
    fingerprint_components:
      contract: 495af3741db6cece0137ddf2eaf263cf885cd7667b8e666f3a048c13e5e4b90d
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
      - symbol_id: SYM-proof-entity-origin-kinds
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
      test_id: TEST-proof-entity-origin-kinds
      domain:
        symbol_id: SYM-const-entity-origin-kinds
        members:
          - human
          - agent
          - migration
          - import
      results:
        - member: human
          outcome: passed
        - member: agent
          outcome: passed
        - member: migration
          outcome: passed
        - member: import
          outcome: passed
    certificate_digest: 1dc84e9f746c5a1c32d02093311cf232cf4c783f625d8fdfbfb0a8145bf73783
    claim_bindings:
      - claim_key: CLAIM-A508A2A195ECC6DD
        requirement_id: REQ-kibi-entity-origin-vocabulary
        fact_id: FACT-entity-origin-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - agent
            - human
            - import
            - migration
---
Proves that an entity origin kind shall be human, agent, migration or import, against the code Kibi reads at ingest.