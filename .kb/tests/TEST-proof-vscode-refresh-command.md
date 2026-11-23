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
    receipt_id: PR-ec3bc2056512756a75b86041
    test_id: TEST-proof-vscode-refresh-command
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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