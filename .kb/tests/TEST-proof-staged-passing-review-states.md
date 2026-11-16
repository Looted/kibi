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
    receipt_id: PR-e82780f8b37b0ddc9102c046
    test_id: TEST-proof-staged-passing-review-states
    scope: unit
    outcome: passed
    code_snapshot: b441a6e8fcbbf95900ea594a22b66d3379943f5b04c9b75215f76c48ae417427
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T17:46:08.721Z'
    finished_at: '2026-11-16T17:46:11.899Z'
    artifact_digest: ea2a394a5b97676a9aed2600ef8fc8e75567971eda2737b27cc3bd83a645f6b9
    contract_hash: 9c24f19da0347487d7a34e5c553488b8bf606aafb1a290cc451b17bb25fc8ab3
    binding_hash: 24ae7d07113730c1cc95b0042f65bb78525a7ddf17b08aa4e841a08af5473a3c
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