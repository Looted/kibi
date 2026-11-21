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
    receipt_id: PR-510d153d8d3e805592fd4042
    test_id: TEST-proof-vscode-container-id
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0fd9733b30adfd5f54ffc7ce9fd1d2eb30f1abb1cbba2ed552dee0819642b6ea
    binding_hash: 05553ac27bbbad1ae06a98fecab125fac01049903136f8fa8cf166aceba8312f
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