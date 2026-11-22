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
    receipt_id: PR-f8a6fb80a97bac7996ef446d
    test_id: TEST-proof-telemetry-evidence-age
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 2b9c101c3283770f00705a8e8c1b9d92c00908895592ca5f160464eaa67ff158
    binding_hash: 113d9048d9d18587ce10360dfa76e305fd0e6e0f09199adf0ec16c3561768cb7
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