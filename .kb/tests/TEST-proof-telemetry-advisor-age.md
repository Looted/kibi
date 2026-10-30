---
title: The maximum semantic-advisor age is 86400 seconds, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-telemetry-advisor-age
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-telemetry-default-policy
      export: DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.advisorMaxAgeSeconds
  proves:
    - CLAIM-F3DAB90B091449BF
origin:
  kind: agent
  recorded_at: '2026-10-28T09:44:06.153Z'
id: TEST-proof-telemetry-advisor-age
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b1c1bdb091339e6335ac4adb
    test_id: TEST-proof-telemetry-advisor-age
    scope: unit
    outcome: passed
    code_snapshot: aaa32e80c832d3a0745978acdf2dc4bdf882c05df0c6e9a2026459b40b6a7a13
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:46:31.557Z'
    finished_at: '2026-10-28T09:46:31.661Z'
    artifact_digest: 0c39aebc94f46d048b6596b8589fd9c0744814e95f0712fde41ae5dba7660f6e
    contract_hash: a13f633621f79861b1b2445c68c19787bf980f3384dd705b98656d2c24750346
    binding_hash: 67f2f6811845674c8dbbca7f6e119fd0bb778d238fd28b51d37c7e22107b295d
    fingerprint: 4e02d166e8b527283482b1294ec90eaffaded6efe85f888f80c8f4f017b3610d
    fingerprint_components:
      contract: a13f633621f79861b1b2445c68c19787bf980f3384dd705b98656d2c24750346
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
      - symbol_id: SYM-proof-telemetry-advisor-age
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-telemetry-advisor-age
      variable: advisor_max_age_seconds
      value_type: int
      assumptions:
        - operator: eq
          value: 86400
      claim:
        operator: eq
        value: 86400
    certificate_digest: 077b0d89f2612922b66aec3f51c20dce5b753d71ed204947ca18da65428ae359
    claim_bindings:
      - claim_key: CLAIM-F3DAB90B091449BF
        requirement_id: REQ-kibi-telemetry-acceptance-thresholds
        fact_id: FACT-telemetry-advisor-age
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 86400
          value_type: int
          variable: advisor_max_age_seconds
---
Reads DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.advisorMaxAgeSeconds and proves the maximum semantic-advisor age is 86400 seconds.