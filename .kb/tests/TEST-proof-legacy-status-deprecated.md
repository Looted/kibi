---
title: A requirement marked deprecated shall be migrated as closed, by a regex proof
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
    - symbol_id: SYM-proof-legacy-status-deprecated
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-suggested-requirement-status
    export: SUGGESTED_REQUIREMENT_STATUS.deprecated
  proves:
    - CLAIM-B15A113A1B7C5377
origin:
  kind: agent
  recorded_at: '2026-10-29T10:42:08.423Z'
id: TEST-proof-legacy-status-deprecated
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6938f0b401f7e453c985b1bb
    test_id: TEST-proof-legacy-status-deprecated
    scope: unit
    outcome: passed
    code_snapshot: faf065f2781c1044c030ed22ef2de1f9fa5ba7e2c43b903b7407837a816cfb65
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:45:13.096Z'
    finished_at: '2026-10-29T10:45:13.343Z'
    artifact_digest: 00a8c84da0aafda70f448f006f0acb25105b7479514f5a0a14e7320581a3680a
    contract_hash: 4723bb9fb3fd08192a8b806a77edc888ac7da13c11d3d4d3613e50a3e2ed6859
    binding_hash: d13937176a53725e77d52bbfa00ea320543c0eccf4207dfc60d28057e5bd3628
    fingerprint: e814b6b273ae488a8da79871aab22558770f110370f905b5a5038817076776a9
    fingerprint_components:
      contract: 4723bb9fb3fd08192a8b806a77edc888ac7da13c11d3d4d3613e50a3e2ed6859
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
      - symbol_id: SYM-proof-legacy-status-deprecated
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
      test_id: TEST-proof-legacy-status-deprecated
      pattern:
        symbol_id: SYM-migration-suggested-requirement-status
        type: string
        value: closed
    certificate_digest: c0058e3d4332d89e7ec7dca3f9cebf3fcd64ab42746309592cc2b7108c94ff11
    claim_bindings:
      - claim_key: CLAIM-B15A113A1B7C5377
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-deprecated
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: closed
---
Proves that a requirement marked deprecated shall be migrated as closed, against the code Kibi reads at ingest.