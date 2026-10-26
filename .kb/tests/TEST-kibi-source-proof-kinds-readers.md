---
title: Source proof readers are exactly the schema's reader enum, by a source proof
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
    - symbol_id: SYM-test-source-proof-kinds-readers
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cli/src/schemas/entity.schema.json
    path: /properties/proof_contract/properties/source/properties/reader/enum
    select: items
  proves:
    - CLAIM-80131AF672B06C75
origin:
  kind: agent
  recorded_at: '2026-10-26T17:38:49.831Z'
id: TEST-kibi-source-proof-kinds-readers
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-43bc9ed2fddcb40fc22d775a
    test_id: TEST-kibi-source-proof-kinds-readers
    scope: unit
    outcome: passed
    code_snapshot: de83f942c55fea0e010711ee2d8adf6d197ea8ae631aaf1a7a1d77582042df88
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-26T17:39:30.719Z'
    finished_at: '2026-10-26T17:39:30.805Z'
    artifact_digest: 3b153ed4fbdb9bf829f5a81971c6d6e689283a9d7498638ba953bcf036117ce4
    contract_hash: 98c41fffb2931282c5e79bb878cf695d4de66b3af7115844211d50fefacead9b
    binding_hash: 5bc4b5350d1c32e23f1e72450ce32fffa34e2eb454ae08ac55a3eefca7233021
    fingerprint: 960a8e9505bdb9bb5c488940bbaeea9ef8334465302f6e5bb1d6d9f0927edf8a
    fingerprint_components:
      contract: 98c41fffb2931282c5e79bb878cf695d4de66b3af7115844211d50fefacead9b
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
      - symbol_id: SYM-test-source-proof-kinds-readers
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
      test_id: TEST-kibi-source-proof-kinds-readers
      source:
        reader: json
        file: packages/cli/src/schemas/entity.schema.json
        path: /properties/proof_contract/properties/source/properties/reader/enum
        select: items
      model:
        members:
          - glob
          - json
          - openapi
          - references
          - routes
          - schema
          - validator
          - yaml
    certificate_digest: 25071fe7910d7c74b0bf89857fad18ab7d785f3bbfe056334fbc4214973671d3
    claim_bindings:
      - claim_key: CLAIM-80131AF672B06C75
        requirement_id: REQ-kibi-source-proof-kinds
        fact_id: FACT-kibi-source-proof-readers
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - glob
            - json
            - openapi
            - references
            - routes
            - schema
            - validator
            - yaml
          operator: eq
---
Kibi reads the reader enum the entity schema publishes for source proof contracts and checks it against the set fact naming the eight source readers; the test only leaves a source certificate for the run.