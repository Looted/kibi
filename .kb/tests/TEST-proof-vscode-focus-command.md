---
title: The focus knowledge base command shall be kibi.focusKnowledgeBase, by a regex proof
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
    - symbol_id: SYM-proof-vscode-focus-command
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-KIBI-FOCUS-KB-COMMAND
  proves:
    - CLAIM-30F20EE8B641CB90
origin:
  kind: agent
  recorded_at: '2026-10-29T17:07:57.723Z'
id: TEST-proof-vscode-focus-command
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0d4a5555984a470f53118d07
    test_id: TEST-proof-vscode-focus-command
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f3a6a1dedfb9cc2eb9688ee78b7ef0cc27ca133a898b799828d3acd077f5aad5
    binding_hash: 1b9895ecdb6474357e1368e8a6bd84f1738ff01c68cc4a2bcff97d1751e88ba1
    fingerprint: 93e3a3711b47f9216ee76482d57183ce542adc71f6f8cd81bd645beb848fc489
    fingerprint_components:
      contract: f3a6a1dedfb9cc2eb9688ee78b7ef0cc27ca133a898b799828d3acd077f5aad5
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
      - symbol_id: SYM-proof-vscode-focus-command
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
      test_id: TEST-proof-vscode-focus-command
      pattern:
        symbol_id: SYM-KIBI-FOCUS-KB-COMMAND
        type: string
        value: kibi.focusKnowledgeBase
    certificate_digest: b69d57f5d106b4784f3861ee78ab8bda27c842d42dfce2fcd537894d2e52d8b4
    claim_bindings:
      - claim_key: CLAIM-30F20EE8B641CB90
        requirement_id: REQ-vscode-extension-ids
        fact_id: FACT-vscode-focus-command
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.focusKnowledgeBase
---
Proves that the focus knowledge base command shall be kibi.focusKnowledgeBase, against the code Kibi reads at ingest.