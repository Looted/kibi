---
title: The Kibi tree view id shall be kibi-knowledge-base, by a regex proof
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
    - symbol_id: SYM-proof-vscode-view-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-KIBI-VIEW-ID
  proves:
    - CLAIM-6982FAB41ED5CC2D
origin:
  kind: agent
  recorded_at: '2026-10-29T17:07:03.072Z'
id: TEST-proof-vscode-view-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-03ace4b8706f60b84b027190
    test_id: TEST-proof-vscode-view-id
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d801cde86e6ec766fa460ec6c3b63b3613caa8ce586ae4b094094b2a9e332418
    binding_hash: c7bfb430f01e9fffeb6653ae7ca9dd2756c90aa7ed8e9a72b99d8a16b4ff454e
    fingerprint: 7d059d3fff881a7b05b6d4bccd8014d72c7efea1de74dc72c6ff5b045d673b44
    fingerprint_components:
      contract: d801cde86e6ec766fa460ec6c3b63b3613caa8ce586ae4b094094b2a9e332418
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
      - symbol_id: SYM-proof-vscode-view-id
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
      test_id: TEST-proof-vscode-view-id
      pattern:
        symbol_id: SYM-KIBI-VIEW-ID
        type: string
        value: kibi-knowledge-base
    certificate_digest: c15ac9c473ff2766e4d7e322ac8f1e37664d56f9eb34b6a5227bcc6561d480f8
    claim_bindings:
      - claim_key: CLAIM-6982FAB41ED5CC2D
        requirement_id: REQ-vscode-extension-ids
        fact_id: FACT-vscode-view-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi-knowledge-base
---
Proves that the Kibi tree view id shall be kibi-knowledge-base, against the code Kibi reads at ingest.