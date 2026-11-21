---
title: Capability plugin observable behavior runs end to end
status: passing
tags:
  - plugins
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-e2e-capability-plugins
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-capability-plugins
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-capability-plugins
    target: default
    native_id: documentation/tests/e2e/capability-plugins.e2e.ts::capability plugin e2e
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7e5ba931c7a68fecf3784ef5
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: a44e4ed22cc45009950164c39d10572f4c341df0bc010e3bd753e8bf87597825
    fingerprint: ce2fe4dc187f6e941f0ef40030042e4ba378ba652b20424de848aee001dd81c9
    fingerprint_components:
      contract: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: feb244889c881b4cdb262f804f63ab7bd42bd9faa69bf34ff91bb76129130935
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-capability-plugins
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
# TEST-e2e-capability-plugins

Runs documentation/tests/e2e/capability-plugins.e2e.ts through the host registry, package resolution, maintenance allowlist, doctor configuration view, and Jev environment configuration.
