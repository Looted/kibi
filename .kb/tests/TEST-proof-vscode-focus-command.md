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
    receipt_id: PR-bfb9496e4ee01e934616b45e
    test_id: TEST-proof-vscode-focus-command
    scope: unit
    outcome: passed
    code_snapshot: 91111697f44f76ef846b59b9d6ba6cfc1da295a8a8076e33d9a46e6c923c8a5f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:09:12.412Z'
    finished_at: '2026-10-29T17:09:12.565Z'
    artifact_digest: f6765431f87e3172b1ebd95a41a77e905bcfeaeb547297e0b6f939a3c2d3d23a
    contract_hash: f3a6a1dedfb9cc2eb9688ee78b7ef0cc27ca133a898b799828d3acd077f5aad5
    binding_hash: d8dd089ef407a263cb65b3098d9e88cdbfd86a95f8dfb0af876ddf3c88490bf7
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