---
title: The refresh tree command shall be kibi.refreshTree, by a regex proof
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
    - symbol_id: SYM-proof-vscode-refresh-command
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-KIBI-REFRESH-TREE-COMMAND
  proves:
    - CLAIM-45F18ABBE214D338
origin:
  kind: agent
  recorded_at: '2026-10-29T17:07:30.446Z'
id: TEST-proof-vscode-refresh-command
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-01a79905fb5a94d733c98f1d
    test_id: TEST-proof-vscode-refresh-command
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 95193e2bc074734450a935dcbee0482e0930ff1fdf26a741da2b3d38275e06d8
    binding_hash: 71e5403ca9a567da8958223f20685d68c68a08c84cf46040d928db79daced31c
    fingerprint: 157972acacddfe290c59ae0c4ff679c799a1d3a6ca500e1520b6d5d5d5c2f471
    fingerprint_components:
      contract: 95193e2bc074734450a935dcbee0482e0930ff1fdf26a741da2b3d38275e06d8
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
      - symbol_id: SYM-proof-vscode-refresh-command
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
      test_id: TEST-proof-vscode-refresh-command
      pattern:
        symbol_id: SYM-KIBI-REFRESH-TREE-COMMAND
        type: string
        value: kibi.refreshTree
    certificate_digest: eef8dc6073aef96f41977b16e07892d44af0b1b4471f09417d7d433ad371fe98
    claim_bindings:
      - claim_key: CLAIM-45F18ABBE214D338
        requirement_id: REQ-vscode-extension-ids
        fact_id: FACT-vscode-refresh-command
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.refreshTree
---
Proves that the refresh tree command shall be kibi.refreshTree, against the code Kibi reads at ingest.