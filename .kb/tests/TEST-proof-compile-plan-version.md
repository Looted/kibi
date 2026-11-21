---
title: The compiled plan version shall be kibi.compile-plan.v1, by a regex proof
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
    - symbol_id: SYM-proof-compile-plan-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-kibi-cli-src-operations-planning-compile-intent-ts-compile-plan-version
  proves:
    - CLAIM-FE782C6BF95D6643
origin:
  kind: agent
  recorded_at: '2026-10-28T17:45:21.088Z'
id: TEST-proof-compile-plan-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-31f09648ea24785c0c994fb3
    test_id: TEST-proof-compile-plan-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 3b55b586a95c18cdaf69e546e112b18ff3f052ce4f79a4798c4c01ceb64f2ca7
    binding_hash: 540b231bc65f4d86b30f3698c0a39f99e365f3bb84248572b2a1d41b850ac00f
    fingerprint: 887712241d69852e0373c4866696f89b65a252cc6dcad5974d0a7ffafd7c8bdb
    fingerprint_components:
      contract: 3b55b586a95c18cdaf69e546e112b18ff3f052ce4f79a4798c4c01ceb64f2ca7
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
      - symbol_id: SYM-proof-compile-plan-version
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
      test_id: TEST-proof-compile-plan-version
      pattern:
        symbol_id: SYM-kibi-cli-src-operations-planning-compile-intent-ts-compile-plan-version
        type: string
        value: kibi.compile-plan.v1
    certificate_digest: 15b98dae1915467a2b43e53d6c4e4902a9a94b4a783ec4437356a75c7f865f1c
    claim_bindings:
      - claim_key: CLAIM-FE782C6BF95D6643
        requirement_id: REQ-kibi-plan-document-versions
        fact_id: FACT-compile-plan-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.compile-plan.v1
---
Proves that the compiled plan version shall be kibi.compile-plan.v1, against the code Kibi reads at ingest.