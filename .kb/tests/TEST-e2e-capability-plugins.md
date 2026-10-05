---
title: Capability plugin observable behavior runs end to end
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-df9050518ee6209f74ad7888
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: c9e6cb0c1bbbf59212171fbd8685df94fe6429c989c66739e4ad4347b06010f6
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# TEST-e2e-capability-plugins

Runs documentation/tests/e2e/capability-plugins.e2e.ts through the host registry, package resolution, maintenance allowlist, doctor configuration view, and Jev environment configuration.
