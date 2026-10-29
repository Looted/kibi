---
title: The Kibi sidebar container id shall be kibi-sidebar, by a regex proof
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
    - symbol_id: SYM-proof-vscode-container-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-KIBI-CONTAINER-ID
  proves:
    - CLAIM-2DBB602BF36E069A
origin:
  kind: agent
  recorded_at: '2026-10-29T17:06:35.292Z'
id: TEST-proof-vscode-container-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dd91459286004a3e46a756fc
    test_id: TEST-proof-vscode-container-id
    scope: unit
    outcome: passed
    code_snapshot: 91111697f44f76ef846b59b9d6ba6cfc1da295a8a8076e33d9a46e6c923c8a5f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:08:38.021Z'
    finished_at: '2026-10-29T17:08:38.178Z'
    artifact_digest: 5538554689e49cf45fe77ce43d1b0ec999ae086fb48b9a1edee3e98805af8f78
    contract_hash: 0fd9733b30adfd5f54ffc7ce9fd1d2eb30f1abb1cbba2ed552dee0819642b6ea
    binding_hash: 2647693ea09db837f664d456387cf6045eabf45e1f1ef349bc3a9a18cf817296
    fingerprint: 7f9c8785a382af6b02a8b0c6605a90dfb4d87b8d927cc023e275fb4362ceeaf6
    fingerprint_components:
      contract: 0fd9733b30adfd5f54ffc7ce9fd1d2eb30f1abb1cbba2ed552dee0819642b6ea
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
      - symbol_id: SYM-proof-vscode-container-id
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
      test_id: TEST-proof-vscode-container-id
      pattern:
        symbol_id: SYM-KIBI-CONTAINER-ID
        type: string
        value: kibi-sidebar
    certificate_digest: 7a2a4731651734156ed3432c02a3c6e11ee14c24c35f751961330e11bd29bdfe
    claim_bindings:
      - claim_key: CLAIM-2DBB602BF36E069A
        requirement_id: REQ-vscode-extension-ids
        fact_id: FACT-vscode-container-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi-sidebar
---
Proves that the Kibi sidebar container id shall be kibi-sidebar, against the code Kibi reads at ingest.