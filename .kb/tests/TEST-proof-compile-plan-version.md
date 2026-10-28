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
    receipt_id: PR-41b93a4f7bb8658d1e8dc53c
    test_id: TEST-proof-compile-plan-version
    scope: unit
    outcome: passed
    code_snapshot: 56eee1707caa78737f9751c722c36d97d6b93523f57a8b6aef7f7bcada87ac9a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:46:43.911Z'
    finished_at: '2026-10-28T17:46:44.117Z'
    artifact_digest: 942c6de0bb01d97832371f19fba495565173784514ec731f741db05521cf7819
    contract_hash: 3b55b586a95c18cdaf69e546e112b18ff3f052ce4f79a4798c4c01ceb64f2ca7
    binding_hash: 8521dc8658c8cd21a8c4a115cf54aaad73fb0522b20366bcc95ff4e2cb0fea02
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