---
title: The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge, by a regex proof
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
    - symbol_id: SYM-proof-supersedes-acknowledge-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-supersedes-reason-acknowledge-code
  proves:
    - CLAIM-9D285E495E7AAEE0
origin:
  kind: agent
  recorded_at: '2026-10-28T20:32:29.349Z'
id: TEST-proof-supersedes-acknowledge-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-33170fc4a3c5cbe18ea2a0b4
    test_id: TEST-proof-supersedes-acknowledge-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 8d3f0f4df05f71f5cc51055faccb56e8f6596b0bd4d6be1591654fe07428a581
    binding_hash: 263e9864ba598404f0d34d9c012f0da21275572717a55f60434cde5e7a04eb32
    fingerprint: 39b8a532921ed17c1ad780cfc70cbf2e3d386d9ba393777d8c47b989f00fb861
    fingerprint_components:
      contract: 8d3f0f4df05f71f5cc51055faccb56e8f6596b0bd4d6be1591654fe07428a581
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
      - symbol_id: SYM-proof-supersedes-acknowledge-code
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
      test_id: TEST-proof-supersedes-acknowledge-code
      pattern:
        symbol_id: SYM-const-supersedes-reason-acknowledge-code
        type: string
        value: supersedes_reason_acknowledge
    certificate_digest: 91fb018bb5e5484474a398832d62ffd4e8282fb89f185779a4b31eb63a5e3ef3
    claim_bindings:
      - claim_key: CLAIM-9D285E495E7AAEE0
        requirement_id: REQ-cli-migration-supersession-codes
        fact_id: FACT-supersedes-acknowledge-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: supersedes_reason_acknowledge
---
Proves that the supersedes reason acknowledgement code shall be supersedes_reason_acknowledge, against the code Kibi reads at ingest.