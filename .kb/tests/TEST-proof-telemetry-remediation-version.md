---
title: The telemetry remediation version shall be kibi.telemetry-remediation.v1, by a regex proof
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
    - symbol_id: SYM-proof-telemetry-remediation-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-reqcompiler-remediation-version
  proves:
    - CLAIM-DF6C9E64C0F42182
origin:
  kind: agent
  recorded_at: '2026-10-28T20:52:44.191Z'
id: TEST-proof-telemetry-remediation-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-67d178384b6feaea25bb8920
    test_id: TEST-proof-telemetry-remediation-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: b83ba554725f1d2682df559369215249d52839f540c206667daba0af8476c3f5
    binding_hash: 868d83d47d9a4bb1d1f8aa56d276571dc758217bcc6a824ef4bd135397568b01
    fingerprint: 2ac14185ee35c0a698612b4e9e90af14f4ecffaa31e5f3391ecffe4e3076fd0c
    fingerprint_components:
      contract: b83ba554725f1d2682df559369215249d52839f540c206667daba0af8476c3f5
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
      - symbol_id: SYM-proof-telemetry-remediation-version
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
      test_id: TEST-proof-telemetry-remediation-version
      pattern:
        symbol_id: SYM-reqcompiler-remediation-version
        type: string
        value: kibi.telemetry-remediation.v1
    certificate_digest: da6e952cb4e422cb1d025945cb7fabe84a2a76b91b027cfbddd5112c03bc829e
    claim_bindings:
      - claim_key: CLAIM-DF6C9E64C0F42182
        requirement_id: REQ-kibi-telemetry-versions
        fact_id: FACT-telemetry-remediation-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.telemetry-remediation.v1
---
Proves that the telemetry remediation version shall be kibi.telemetry-remediation.v1, against the code Kibi reads at ingest.