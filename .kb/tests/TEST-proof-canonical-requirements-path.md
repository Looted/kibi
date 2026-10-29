---
title: The canonical requirements path shall be .kb/requirements, by a regex proof
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
    - symbol_id: SYM-proof-canonical-requirements-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
    export: CANONICAL_ENTITY_PATHS.requirements
  proves:
    - CLAIM-190E61DE4B8E049B
origin:
  kind: agent
  recorded_at: '2026-10-28T22:34:17.006Z'
id: TEST-proof-canonical-requirements-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-69c4aa99114492a4132b48bf
    test_id: TEST-proof-canonical-requirements-path
    scope: unit
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:37:40.032Z'
    finished_at: '2026-10-28T22:37:40.116Z'
    artifact_digest: fa249364ce273617b507fdd9a2b79e2dcb43877615a7cf2fddc9a28eb5830fab
    contract_hash: 6bc637a88f7518b802cc9bd0d2ff4855148ac1f3668b7042f6e14073a3fd3aaf
    binding_hash: 4609a0a47844999a32d3202bc9bbed85f91fade94ac794ed252ad382ff4972f6
    fingerprint: 3e4b8686e4aef1b255970223642013fc099a22c54dccf10212ccb6d38ba97e1e
    fingerprint_components:
      contract: 6bc637a88f7518b802cc9bd0d2ff4855148ac1f3668b7042f6e14073a3fd3aaf
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
      - symbol_id: SYM-proof-canonical-requirements-path
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
      test_id: TEST-proof-canonical-requirements-path
      pattern:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        type: string
        value: .kb/requirements
    certificate_digest: 330019f5139adb4b7ff6fc5517e7581871f7541cb8e1bd677dd8373caf7efb6a
    claim_bindings:
      - claim_key: CLAIM-190E61DE4B8E049B
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-requirements-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/requirements
---
Proves that the canonical requirements path shall be .kb/requirements, against the code Kibi reads at ingest.