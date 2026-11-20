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
    receipt_id: PR-9ee80f4a41331e5b107cf4cf
    test_id: TEST-proof-canonical-requirements-path
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6bc637a88f7518b802cc9bd0d2ff4855148ac1f3668b7042f6e14073a3fd3aaf
    binding_hash: 4b5e2dfe100448ef5f1c9f9543fcfece7c756f0b90172f54fa9200fce57613b9
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