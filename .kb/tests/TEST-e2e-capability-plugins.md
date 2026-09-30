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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9e6f8321674031ccefa46256
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
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
    receipt_id: PR-3fcd3eb8ff1a31d0cf1f1eee
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: failed
    code_snapshot: 17d26c6bf27a3e5fa42113f021bf2b250140851aea8a51dcb29e71ea85465ffc
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:09:39.572Z'
    finished_at: '2026-09-26T11:26:46.912Z'
    artifact_digest: 5e15c583ed601b53256856b0f62aa348fec3a03cc76f327007241136eff85214
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
    receipt_id: PR-b7eb3f678f4bff8869c8f145
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: a20108970eddbe026c332f8f0fef6001fa956bf246b5dee956c8c7586f878071
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:43:16.296Z'
    finished_at: '2026-09-26T11:59:41.121Z'
    artifact_digest: b458ebe1ef850179dd754bc08eb0a62bb0e46b7bbf068e00bb4230915cc296ed
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
    receipt_id: PR-9e32b4bb045468941d2e07ba
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: de201a2dd0c317058bd0fb2437de496eaadfbdd3e21c3fd432d77169cc672e2e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T12:51:30.031Z'
    finished_at: '2026-09-26T13:07:42.195Z'
    artifact_digest: c9cece4a6c8412af4af92cf82807f3850d2b801045aacf7d48830d68278a660f
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
    receipt_id: PR-a028ca5c0238c2bc071cdb6f
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: 5b48c0a3883b7536cf6deb6ced03e3127349d55dfa5b78fcd7466dcabb3b1d46
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T23:50:31.951Z'
    finished_at: '2026-09-27T00:15:04.234Z'
    artifact_digest: 9641e1263e8cbd4aec2a63cf924f78c694de2fa481b3e6b278d288dc964e768b
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
    receipt_id: PR-c2be2a82a081a87676533fe3
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: edf31aeb17bae9696cd9be1db2cfdab1162934903a40aff8334d03e84edd5872
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T09:58:13.375Z'
    finished_at: '2026-09-27T10:21:29.406Z'
    artifact_digest: 601f3dfdaa45bbef34f649d3ddd7d3e53a7dc2ba372aa80398ec1e1a58170f59
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
    receipt_id: PR-4ed97d19561bf60bf9d24960
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: 1c7fc342e7e2f6dde52ad4d4bfb3dccda5184f524d128ad26d3d6aa8928b80df
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T15:30:37.315Z'
    finished_at: '2026-09-27T16:09:53.858Z'
    artifact_digest: cab9ee9d09f579ccae00bea019b0266d72e41c24a37e65651b84956de238bb61
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 9881b453de675ac6e053eac7a76c96030b4c78212738fff439b75890f7647bca
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
    receipt_id: PR-68b82f86d9e779063e37f639
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d2237db9cb9df68ce5a43a5ebb63dbe6b70f66b617d7ffa68d33c708da3cf9f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T22:29:15.770Z'
    finished_at: '2026-09-27T23:18:57.015Z'
    artifact_digest: 63668ccae6cd3a610be243d571de8e94f160e26926e4fd9f926a702b3a19dd3e
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 9881b453de675ac6e053eac7a76c96030b4c78212738fff439b75890f7647bca
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
    receipt_id: PR-6eded4adf7e5348fe1933ee3
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: failed
    code_snapshot: 39ed85118d250bd2a174df1470b9e719eddea4ec27ccaf9e8f821beb57e40d29
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T11:20:25.227Z'
    finished_at: '2026-09-28T11:41:43.503Z'
    artifact_digest: f0b89cea9d05ed19dfe6b7af6e0e61e449561a983432945f8d7e630e16ff97a4
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 8add4c66de512d699e1507c8be811b3dd3c274f81550087477436ede7a1d6c5c
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
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +110 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2b67328ce45e5d79da903f9b
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 8add4c66de512d699e1507c8be811b3dd3c274f81550087477436ede7a1d6c5c
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
    receipt_id: PR-f4ba0649886f15652c240b9a
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: b33fdfc93bc9fa277a1bf6cd3a70da78a9e0a2ce7f08f58fe37d1866bdb7f26d
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
    receipt_id: PR-2d1c257df525ae082f121411
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 98c45932065497c0dc4e43cafd2ba7c08151fb9caf5098740eb68946f91521f5
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
    receipt_id: PR-f51e2301372b2a3888b12249
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 98c45932065497c0dc4e43cafd2ba7c08151fb9caf5098740eb68946f91521f5
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
    receipt_id: PR-4df350aae6e8b36f2dccb60c
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: failed
    code_snapshot: 9bcc8b513a01ef4f9111de27aade8bd53f673d9ddb4e46f4abc140bd47a86049
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:12:05.199Z'
    finished_at: '2026-09-30T08:38:22.434Z'
    artifact_digest: 44c949f581d06af649a1081ae9da1ead93f0ae21026d70041fa4d94b47bf4932
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 98c45932065497c0dc4e43cafd2ba7c08151fb9caf5098740eb68946f91521f5
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
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +129 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1e923fe6854b4a86abeebdd6
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: ed1115190903fc4f82bb767e1b0059128bf1cbde83d1399fa5ad8c0e00436e53
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:44:35.132Z'
    finished_at: '2026-09-30T09:14:07.509Z'
    artifact_digest: 8e767a8048bc0337afb4a16cb7c6e110f417e9b6181130df0b402240760ca7fe
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: 98c45932065497c0dc4e43cafd2ba7c08151fb9caf5098740eb68946f91521f5
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
    receipt_id: PR-055c642f6ca7604eb845ab83
    test_id: TEST-e2e-capability-plugins
    scope: end_to_end
    outcome: passed
    code_snapshot: c3c9302244ec6e144d390e104379a6e3429b9a4b9213aef16ed2eaa1d918afde
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T19:02:28.214Z'
    finished_at: '2026-09-30T19:38:21.534Z'
    artifact_digest: 3dc2234689cf3a5cdb82deb224ed2f23cad0fdf7d9deeace00bc19308244c4ba
    contract_hash: f6d6ffef7afb404c969f85b63a2da379197e4d59593d58329a581ff267c11047
    binding_hash: a5f6b15c83c5f5a72914cdc626486332c030b996b15deaa3e715823f2a59970f
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
