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
    receipt_id: PR-e5295ffb2280ce2e7e435f5d
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 32b3ce6fc358aa9c0b10366b6eada6998075711cb5a27fc0a5335d6c964f5d31
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c1addcc367e4cdcaf624f371
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 32b3ce6fc358aa9c0b10366b6eada6998075711cb5a27fc0a5335d6c964f5d31
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-61afae27296914b5dcd4775c
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 32b3ce6fc358aa9c0b10366b6eada6998075711cb5a27fc0a5335d6c964f5d31
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-capability-plugins
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-capability-plugins
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-447e0f99df99cabcb1cf1e22
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 32b3ce6fc358aa9c0b10366b6eada6998075711cb5a27fc0a5335d6c964f5d31
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
---
# TEST-e2e-capability-plugins

Runs documentation/tests/e2e/capability-plugins.e2e.ts through the host registry, package resolution, maintenance allowlist, doctor configuration view, and Jev environment configuration.
