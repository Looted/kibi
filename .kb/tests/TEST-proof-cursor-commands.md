---
title: 'Source proof: kibi-cursor ships the bootstrap command'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:53:12.862Z'
id: TEST-proof-cursor-commands
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-commands
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/cursor/commands/*.md
    capture: true
  proves:
    - CLAIM-93D62596C7630D34
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9d2ee618a3fedd711a76e985
    test_id: TEST-proof-cursor-commands
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 2e9d1910de987d107ad70397ee4a197809508692b353ae2b0905a89f39acd947
    binding_hash: cbc56e93f7c8cbb485dd099d94cd9a28a663ebe3293322990325ef4bc44d833d
    fingerprint: 8cfdf46da95bf5605c563339f10c56d980ee8ee1d509606e90a829314f5f3cf4
    fingerprint_components:
      contract: 2e9d1910de987d107ad70397ee4a197809508692b353ae2b0905a89f39acd947
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
      - symbol_id: SYM-proof-cursor-commands
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-cursor-commands
      source:
        reader: glob
        pattern: packages/cursor/commands/*.md
        capture: true
      model:
        members:
          - kibi-bootstrap
          - kibi-signoff
    certificate_digest: 4608da187643b9848ba849a0e0cf8db64fe5fc0d065868a9b0d18d4387929b39
    claim_bindings:
      - claim_key: CLAIM-93D62596C7630D34
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-commands-include-bootstrap
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-bootstrap
          operator: includes
---
Globs packages/cursor/commands/*.md. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
