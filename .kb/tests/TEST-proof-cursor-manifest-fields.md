---
title: 'Source proof: the kibi-cursor manifest declares its plugin parts'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:52:40.599Z'
id: TEST-proof-cursor-manifest-fields
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-manifest-fields
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/.cursor-plugin/plugin.json
    path: ''
    select: keys
  proves:
    - CLAIM-F7A928E9B3D62DB3
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e02ea3d27a99c9a615d13e30
    test_id: TEST-proof-cursor-manifest-fields
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6f991f83b95fa76e8cf0adf1946f4663704829a94b7509e88e90f90ec00f6827
    binding_hash: d7cb0f5974dd61d1d90a2236bcf76c474c414ee0eec6407809e3f47a208376ef
    fingerprint: c848d0e00d662cc3d6354ef53bc75df53649050d4db5dfca707f9e01ccbc99bd
    fingerprint_components:
      contract: 6f991f83b95fa76e8cf0adf1946f4663704829a94b7509e88e90f90ec00f6827
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
      - symbol_id: SYM-proof-cursor-manifest-fields
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
      test_id: TEST-proof-cursor-manifest-fields
      source:
        reader: json
        file: packages/cursor/.cursor-plugin/plugin.json
        path: ''
        select: keys
      model:
        members:
          - author
          - commands
          - description
          - displayName
          - homepage
          - hooks
          - keywords
          - license
          - mcpServers
          - name
          - repository
          - rules
          - skills
          - version
    certificate_digest: d628b7046345d0b27eccfe4ab4225bda1e3ae5b7fb515d101eb1c86c91e357da
    claim_bindings:
      - claim_key: CLAIM-F7A928E9B3D62DB3
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-manifest-declares-plugin-parts
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - commands
            - hooks
            - mcpServers
            - rules
            - skills
          operator: includes
---
Reads the top-level fields of packages/cursor/.cursor-plugin/plugin.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
