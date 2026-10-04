---
title: Curated suite batch runner surfaces actionable failure diagnostics
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-root-batch-diagnostics
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-root-batch-diagnostics
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dcaccb5f7db6598c312df771
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 11c06186018ab9693128b6a786ed11399a85d16b98f2ac510aef9372a56ad253
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-04T19:15:18.982Z'
    finished_at: '2026-10-04T19:15:19.161Z'
    artifact_digest: cb5ef3d51f9fdbeb8837671f873b6626a788cc9d79d146585deec58cae4241b9
    contract_hash: c087ad48ac9a2f5fc8910215aaa825524f3dd4e8eca9c1da50bfc262729ff5f7
    binding_hash: 713a5a3422fd0305f34b9c7db1eae7415ec5a97c5ae2bb2e89ef7c2c57847dda
    fingerprint: 8e1dc5fbf12bc3e17485a3d3fc4f4bfe0ca9ccf002ac2399a0cc5ed2c54f2e7e
    fingerprint_components:
      contract: c087ad48ac9a2f5fc8910215aaa825524f3dd4e8eca9c1da50bfc262729ff5f7
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
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
