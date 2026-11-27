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
    receipt_id: PR-3d3440decee6b0dfe133749b
    test_id: TEST-proof-opencode-plugin-id
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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