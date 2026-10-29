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
    receipt_id: PR-443726d4461527aaadd4c6a0
    test_id: TEST-proof-vscode-view-id
    scope: unit
    outcome: passed
    code_snapshot: 91111697f44f76ef846b59b9d6ba6cfc1da295a8a8076e33d9a46e6c923c8a5f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:08:49.177Z'
    finished_at: '2026-10-29T17:08:49.334Z'
    artifact_digest: dc76edf6dae348c98962ea9ff5f8b7cb03d20650d345717ea4714b5a11bd3303
    contract_hash: d801cde86e6ec766fa460ec6c3b63b3613caa8ce586ae4b094094b2a9e332418
    binding_hash: ce23edd0fa07331f4bf260b87899412350cfe2a7a9faa901d25b7addd31ab56e
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