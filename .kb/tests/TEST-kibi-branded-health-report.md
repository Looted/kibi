---
title: Branded requirement health report and badge tests
status: active
tags:
  - cli
  - report
  - badge
  - brand
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-kibi-branded-health-report
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-html-report
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bebf896ad1bfb25b3cdde51a
    test_id: TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:31:06.923Z'
    finished_at: '2026-10-28T22:32:12.999Z'
    artifact_digest: f30798302cd0bb95dd5965f974049e7de0c6e16047f5bdf8ffe41155374828a3
    contract_hash: 2f31254052a59a9fb46df94ddf4c6f43dff44ea0a598a852a1be4d8b139b509f
    binding_hash: 761d96172641980e47e007a96e0b4746b98948e533477a0748760ce673924044
    fingerprint: 2f3df781634b239cd492e250ef08d6d1d03d12f3f8da40e0470916f004101c62
    fingerprint_components:
      contract: 2f31254052a59a9fb46df94ddf4c6f43dff44ea0a598a852a1be4d8b139b509f
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
      - symbol_id: SYM-e2e-packed-cli-html-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Covers canonical inline marks and tokens, exact proof ratio semantics, sequential earliest-blocker gate counts, accessible status text, responsive and print styling, self-contained output, and the generated branded SVG badge with Codecov-style chrome and a compact kibi label beside the logo.
