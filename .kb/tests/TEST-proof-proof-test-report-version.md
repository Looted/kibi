---
title: The per-test proof report version shall be kibi.proof-test-report.v1, by a regex proof
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
    - symbol_id: SYM-proof-proof-test-report-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-test-report-version
  proves:
    - CLAIM-EBFEB6B891A3FA1A
origin:
  kind: agent
  recorded_at: '2026-10-28T11:07:37.202Z'
id: TEST-proof-proof-test-report-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e59d207d997c43ecc41c8126
    test_id: TEST-proof-proof-test-report-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 84ec604d1b8d24223a1720edd90041f55f91057f28811cf638ea249980928d80
    binding_hash: ae4ee49a63ab114c05cedf316df5fbe26ec46a98de79726131110e746780bbcc
    fingerprint: fe91df38341ff47a0bf6313c1ccfe81e6286aac9481b1e34cba4f19e53ceedca
    fingerprint_components:
      contract: 84ec604d1b8d24223a1720edd90041f55f91057f28811cf638ea249980928d80
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
      - symbol_id: SYM-proof-proof-test-report-version
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
      test_id: TEST-proof-proof-test-report-version
      pattern:
        symbol_id: SYM-const-proof-test-report-version
        type: string
        value: kibi.proof-test-report.v1
    certificate_digest: 7cab373f17bd04a46f547dd18949ac7ff16ee2df541b7e2e50a2216b75fe2cd2
    claim_bindings:
      - claim_key: CLAIM-EBFEB6B891A3FA1A
        requirement_id: REQ-kibi-proof-step-settings
        fact_id: FACT-proof-test-report-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-test-report.v1
---
Proves that the per-test proof report version shall be kibi.proof-test-report.v1, against the code Kibi reads at ingest.