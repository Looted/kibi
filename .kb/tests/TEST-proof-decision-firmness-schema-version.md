---
title: Decision firmness shall start at KB schema version 9, by an arithmetic proof
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
    - symbol_id: SYM-proof-decision-firmness-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-schema6-DECISION_FIRMNESS_SCHEMA_VERSION
  proves:
    - CLAIM-0061976CDD089FC0
origin:
  kind: agent
  recorded_at: '2026-10-28T11:03:31.982Z'
id: TEST-proof-decision-firmness-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f790e3ec5451eb2882a9ed93
    test_id: TEST-proof-decision-firmness-schema-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: b693d0c9fbcc845875326667132b38354115edcb6a7d44a14bc81574b8e91b66
    binding_hash: fe0038d9849bb401461ca762685e7c858ac31fbea7c164c82ce5a2af14c5ae39
    fingerprint: f2dc61532013b02e2344a8a0dcada34d2bf8a133e5d391555c9178a1cc8c1acc
    fingerprint_components:
      contract: b693d0c9fbcc845875326667132b38354115edcb6a7d44a14bc81574b8e91b66
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
      - symbol_id: SYM-proof-decision-firmness-schema-version
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
      test_id: TEST-proof-decision-firmness-schema-version
      variable: firmness_schema_version
      value_type: int
      assumptions:
        - operator: eq
          value: 9
      claim:
        operator: eq
        value: 9
    certificate_digest: 793c15e5524ebeab71cbfdef51eabc54e510dc599c1c39c52c655f93d2084bae
    claim_bindings:
      - claim_key: CLAIM-0061976CDD089FC0
        requirement_id: REQ-kb-decision-firmness-rule-ids
        fact_id: FACT-decision-firmness-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 9
          value_type: int
          variable: firmness_schema_version
---
Proves that decision firmness shall start at KB schema version 9, against the code Kibi reads at ingest.