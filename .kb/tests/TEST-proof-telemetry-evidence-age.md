---
title: The maximum telemetry evidence age is 604800 seconds, by an arithmetic proof
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
    - symbol_id: SYM-proof-telemetry-evidence-age
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-telemetry-default-policy
      export: DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.maxEvidenceAgeSeconds
  proves:
    - CLAIM-0731977316FB677B
origin:
  kind: agent
  recorded_at: '2026-10-28T09:43:38.768Z'
id: TEST-proof-telemetry-evidence-age
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-aecf8ce6097cb2e21545cc06
    test_id: TEST-proof-telemetry-evidence-age
    scope: unit
    outcome: passed
    code_snapshot: aaa32e80c832d3a0745978acdf2dc4bdf882c05df0c6e9a2026459b40b6a7a13
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:46:19.809Z'
    finished_at: '2026-10-28T09:46:19.939Z'
    artifact_digest: c4adcc4b63bd23eaa6863bb22d55e1388d912632f84555269de30e10f989727c
    contract_hash: 2b9c101c3283770f00705a8e8c1b9d92c00908895592ca5f160464eaa67ff158
    binding_hash: 7640031c21635df4cdefb60a2d6e47d268628965f1a85eadf06be0d48748706b
    fingerprint: 420d139b99113549ba83ea02f577c6f112437cc43bdb8260fc2625c971bf2bd9
    fingerprint_components:
      contract: 2b9c101c3283770f00705a8e8c1b9d92c00908895592ca5f160464eaa67ff158
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
      - symbol_id: SYM-proof-telemetry-evidence-age
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
      test_id: TEST-proof-telemetry-evidence-age
      variable: max_evidence_age_seconds
      value_type: int
      assumptions:
        - operator: eq
          value: 604800
      claim:
        operator: eq
        value: 604800
    certificate_digest: c1652a6e3536dca7ac61fc5735823aae374721ee89f7860598c96679a7624e0c
    claim_bindings:
      - claim_key: CLAIM-0731977316FB677B
        requirement_id: REQ-kibi-telemetry-acceptance-thresholds
        fact_id: FACT-telemetry-evidence-age
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 604800
          value_type: int
          variable: max_evidence_age_seconds
---
Reads DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.maxEvidenceAgeSeconds and proves the maximum telemetry evidence age is 604800 seconds.