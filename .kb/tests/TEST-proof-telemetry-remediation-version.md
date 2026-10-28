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
    receipt_id: PR-36ad535ca254b6b433b14cee
    test_id: TEST-proof-telemetry-remediation-version
    scope: unit
    outcome: passed
    code_snapshot: 25d6f9f7c94412ebd022bf7299d1f96ef3ecdaebd005b4d852c619957f6bd1ad
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:54:47.173Z'
    finished_at: '2026-10-28T20:54:47.284Z'
    artifact_digest: 12b7538378d22cfc75c4fb7f81498da61225e6911d71606d1c2fd0b7275098dc
    contract_hash: b83ba554725f1d2682df559369215249d52839f540c206667daba0af8476c3f5
    binding_hash: d08c33e18e88874093a877d5e92333600e463f0bf8fa8e527f75201473bf8333
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