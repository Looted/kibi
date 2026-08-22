---
id: TEST-kibi-change-to-proof-evaluation
title: Change-to-proof evaluation harness
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-change-to-proof-evaluation.md
priority: should
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - evaluation
  - search
  - planning
  - dogfood
  - test
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-evaluation
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-change-to-proof-evaluation
  required_case_symbols:
    - SYM-test-kibi-change-to-proof-evaluation
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fb8ac7178c1409e6edb807f2
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:43:51.041Z'
    finished_at: '2026-08-16T19:43:51.072Z'
    artifact_digest: 7b9f7c86103c2db2e68ffd31b8cb02c16347167b165ba9b48b846ef4a3c1cf98
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-24ce5a0e2b8ce8145a84e69c
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:06:42.272Z'
    finished_at: '2026-08-16T22:06:42.310Z'
    artifact_digest: db55b551a6ba7558c044afe8670ec5764f7052796db23185edfdde1b75c4bc51
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0ccb8e94cf2e58df2788b45f
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:26:52.707Z'
    finished_at: '2026-08-17T12:26:52.738Z'
    artifact_digest: 61f787596c06870ae3fb3ea2f3ec38c976c1c637e8f73fd3e19458c2310d1796
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-08222f11d76ffe358b50497a
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:19:34.759Z'
    finished_at: '2026-08-17T21:19:34.786Z'
    artifact_digest: da2b77c76a8b84a8f44cf3e00ed041371c3d552f5585cf289c6533489b54d732
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 27
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f22952e56401e1467336fb61
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:35:12.593Z'
    finished_at: '2026-08-18T07:35:12.626Z'
    artifact_digest: 7f764eb1e12b78d469249ad7a80cc09fc06f49a7a57848b05101489149614260
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
  - version: kibi.verification-receipt.v2
    receipt_id: VR-abe3745e552160b7cedd05ca
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T11:01:23.503Z'
    finished_at: '2026-08-18T11:01:23.535Z'
    artifact_digest: be41e295b5c4bf4c5322d516240bfed26716013627409a095cae518fafaaf203
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 32
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bc9a37129cce9cca89dedf70
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:58:04.639Z'
    finished_at: '2026-08-21T22:58:04.683Z'
    artifact_digest: 0ceda01d5b88b553343979dccbedd4c87c964f752001d076d259c5a7c67d13aa
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44
  - version: kibi.verification-receipt.v2
    receipt_id: VR-40f78480c4ee2aa196f41144
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:24:34.355Z'
    finished_at: '2026-08-22T01:24:34.401Z'
    artifact_digest: 924f01eea314102079eed34ae9f40afb40fa5c9587b1e45965171e2107a22817
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6b17ccf86574e6ce84b678aa
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:26:14.294Z'
    finished_at: '2026-08-22T08:26:14.337Z'
    artifact_digest: e91d55982a4decd8fe0b46459955b9cb61581926a46eca793d20d6c1f3ecb2c3
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43
  - version: kibi.verification-receipt.v2
    receipt_id: VR-784534ceb16663eb976d1b86
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:06:43.728Z'
    finished_at: '2026-08-22T10:06:43.762Z'
    artifact_digest: 455c06aa52dbf60fdb813036d6f4466f17d7d3b7f8aa555fadd338bcc0997f75
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ba6d7eb2273ad725fdc0b137
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:00:24.212Z'
    finished_at: '2026-08-22T13:00:24.243Z'
    artifact_digest: 8ba92c252f65a1ee11d87d5d121a2a06173846aac8b47e0af8a5c6d511dd756f
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-01ee902a4d96584486fbd9f5
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:44:28.047Z'
    finished_at: '2026-08-22T21:44:28.080Z'
    artifact_digest: 236b9e77300e15df4205ff3807d751ad1b22f221da3e1e1faf3686abdd540a05
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
  - version: kibi.verification-receipt.v2
    receipt_id: VR-391a579e9c9509b0ee96b836
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:50:00.828Z'
    finished_at: '2026-08-22T21:50:00.861Z'
    artifact_digest: 1026c2beb704748b791115b62f883ff47ebbe6489cd55953d71d0b4e210e8a7f
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dbd76482c45ab5e61f5ed7ed
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:18:48.453Z'
    finished_at: '2026-08-22T22:18:48.486Z'
    artifact_digest: 7504e13d339432a6c02efeec0925d9a15629ea8db147731e62e43c7083a1c184
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
---

The evaluator reads versioned JSONL gold fixtures and emits deterministic JSON with per-case matches, clause dispositions, abstentions, and aggregate scores. It fails closed when an expected result is missing or when a proof claim lacks the required evidence path.
