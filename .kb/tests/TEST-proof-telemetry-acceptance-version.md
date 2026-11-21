---
title: The telemetry acceptance version shall be kibi.telemetry-acceptance.v1, by a regex proof
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
    - symbol_id: SYM-proof-telemetry-acceptance-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-reqcompiler-telemetry-acceptance-version
  proves:
    - CLAIM-461C66C6CB3D0930
origin:
  kind: agent
  recorded_at: '2026-10-28T20:52:23.994Z'
id: TEST-proof-telemetry-acceptance-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7575b33f7235de5938ffdef3
    test_id: TEST-proof-telemetry-acceptance-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: f8fa89de80ff21e3480dc17bd6ba055970a4afacd881c8ad2c6cbaf887e5cf6e
    binding_hash: 71024f7def379914a336369f7f31d1e16bafaeab31b53f7a8e74997e086dcde7
    fingerprint: 215246c941887f8a447d724854bf578b6147369c077f208cfda2fc9f09358da0
    fingerprint_components:
      contract: f8fa89de80ff21e3480dc17bd6ba055970a4afacd881c8ad2c6cbaf887e5cf6e
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
      - symbol_id: SYM-proof-telemetry-acceptance-version
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
      test_id: TEST-proof-telemetry-acceptance-version
      pattern:
        symbol_id: SYM-reqcompiler-telemetry-acceptance-version
        type: string
        value: kibi.telemetry-acceptance.v1
    certificate_digest: 0517ca805aaca5cef2440da13d9d802eedbece293226ce22a3bed790145fa980
    claim_bindings:
      - claim_key: CLAIM-461C66C6CB3D0930
        requirement_id: REQ-kibi-telemetry-versions
        fact_id: FACT-telemetry-acceptance-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.telemetry-acceptance.v1
---
Proves that the telemetry acceptance version shall be kibi.telemetry-acceptance.v1, against the code Kibi reads at ingest.