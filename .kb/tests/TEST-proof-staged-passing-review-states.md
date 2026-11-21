---
title: Only kept lets a staged change of firm code through, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-staged-passing-review-states
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-staged-passing-review-states
  proves:
    - CLAIM-48F403C837AE3C32
origin:
  kind: agent
  recorded_at: '2026-11-16T11:04:43.021Z'
id: TEST-proof-staged-passing-review-states
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-94b1e0e11a3be6e92d3628f8
    test_id: TEST-proof-staged-passing-review-states
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 9c24f19da0347487d7a34e5c553488b8bf606aafb1a290cc451b17bb25fc8ab3
    binding_hash: 252df4ea66da1309a048318f4cbcb88c5b31c734fa13ebf192c1cc8fb8f89fb1
    fingerprint: 3667521d11059f2464769efc7b6f944469e9b5162cd4d372ddab72d884cb89dd
    fingerprint_components:
      contract: 9c24f19da0347487d7a34e5c553488b8bf606aafb1a290cc451b17bb25fc8ab3
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
      - symbol_id: SYM-proof-staged-passing-review-states
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-staged-passing-review-states
      domain:
        symbol_id: SYM-const-staged-passing-review-states
        members:
          - kept
      results:
        - member: kept
          outcome: passed
    certificate_digest: 0f01799c54dffef1e2c9fcc382dacaca029410fd8d3ae09a9461449b51fb314c
    claim_bindings:
      - claim_key: CLAIM-48F403C837AE3C32
        requirement_id: REQ-kibi-staged-firm-edit-gate
        fact_id: FACT-staged-firm-edit-passing-states
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kept
---
Proves that only the kept review state lets a staged change of firm code through, against the code Kibi reads at ingest.