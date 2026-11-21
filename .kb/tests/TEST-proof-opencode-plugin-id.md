---
title: The OpenCode plugin id shall be kibi-opencode, by a regex proof
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
    - symbol_id: SYM-proof-opencode-plugin-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-kibi-opencode-plugin-id
  proves:
    - CLAIM-E677C39A65904A11
origin:
  kind: agent
  recorded_at: '2026-10-29T17:01:59.678Z'
id: TEST-proof-opencode-plugin-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d5b27a9cd4a06d3be42ac906
    test_id: TEST-proof-opencode-plugin-id
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e881a33007ca90a7cb7f0e47848eeca7d02c2bef0ac95012160b513a71b8690e
    binding_hash: 30960ff743c995d69023034e97878387f941cf2b21887f143659ed1ca6fdfe87
    fingerprint: e3aa984b62bf37c9e90dba6a58c9e57958eb0685e6293637faaef6d9a4b6c12a
    fingerprint_components:
      contract: e881a33007ca90a7cb7f0e47848eeca7d02c2bef0ac95012160b513a71b8690e
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
      - symbol_id: SYM-proof-opencode-plugin-id
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
      test_id: TEST-proof-opencode-plugin-id
      pattern:
        symbol_id: SYM-const-kibi-opencode-plugin-id
        type: string
        value: kibi-opencode
    certificate_digest: 355cdad45b4afe61e3a85b20738afc4e5b5caa580cef670067f665d3b289bd5d
    claim_bindings:
      - claim_key: CLAIM-E677C39A65904A11
        requirement_id: REQ-opencode-plugin-ids
        fact_id: FACT-opencode-plugin-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi-opencode
---
Proves that the OpenCode plugin id shall be kibi-opencode, against the code Kibi reads at ingest.