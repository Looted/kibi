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
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-branded-health-report
  required_case_symbols:
    - SYM-e2e-packed-cli-html-report
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-65785647780c301be2d65283
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: failed
    code_snapshot: 12a6db834b968de06289672a27627216c87293e10a58bddf53c50189d71388f8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T18:46:13.414Z'
    finished_at: '2026-08-17T18:46:57.826Z'
    artifact_digest: 7fef76eb894209e082ed8df33e758a37c1c73b06979f27562899a2e4ebf9deba
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: failed
        retries: 0
        duration_ms: 44412
  - version: kibi.verification-receipt.v2
    receipt_id: VR-45012e6edfbf0371c38ca19c
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 12a6db834b968de06289672a27627216c87293e10a58bddf53c50189d71388f8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T18:48:46.241Z'
    finished_at: '2026-08-17T18:49:29.212Z'
    artifact_digest: f83c866072606eb9753ac26bb06a11dca062cd2558922276057dc7c5946511f3
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42971
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3bf8804827bd6e6edd925e31
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:01:14.580Z'
    finished_at: '2026-08-17T21:01:57.572Z'
    artifact_digest: 05042ef58147d78f46f2aaecac5c8e8edba326f8a12a9d6c7a4995362fbdb89d
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42992
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1e3fda20eb7656a60fcd0d08
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:15:45.251Z'
    finished_at: '2026-08-18T07:16:31.442Z'
    artifact_digest: ed037bf8983a85365e23fc0200997b95135c662e7b35d83f3740690b111a0bd1
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46191
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3eef727ee09c773d557cc87a
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:44:22.249Z'
    finished_at: '2026-08-18T10:45:09.214Z'
    artifact_digest: e78ca44bf358c59ee71a811a38e51828e6bbf344b2386cea2f4b43b3eef33108
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46965
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2371c5bbfd6d84e7c802615a
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:53:11.578Z'
    finished_at: '2026-08-21T21:53:26.703Z'
    artifact_digest: 1a2398f73e2af8d586c6f9ecc0865fcc095558d3719f4e46fc43675df5ebe542
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15125
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc960b679640a38c22e245c4
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:08:35.585Z'
    finished_at: '2026-08-21T22:08:50.000Z'
    artifact_digest: 13c60dc0f819a562c4394237f449d8ba746719c405c5cc0453a7f785b511de0a
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14415
  - version: kibi.verification-receipt.v2
    receipt_id: VR-844bb5ca2a2ef35314b78e5a
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:59:16.867Z'
    finished_at: '2026-08-22T00:59:37.392Z'
    artifact_digest: 4b99f36846be559d7b34dfc6b2413871ba6bf4f5ecac2b579e7c98a83d131839
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20525
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d357889eee007b3df27b069a
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:01:01.375Z'
    finished_at: '2026-08-22T08:01:16.709Z'
    artifact_digest: aadce68814d9c89fb88c3ca0743ccbe86a6ff42dde05c210461c0cd41b7b085a
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15334
  - version: kibi.verification-receipt.v2
    receipt_id: VR-28f214407c6a02e8dc429288
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:49:02.913Z'
    finished_at: '2026-08-22T09:49:17.616Z'
    artifact_digest: 9b312c852924343055c9abb4c5293c2f0724c39752a1a8068d9890b69d6258d4
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14703
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d0080bef9393306a9b44c07b
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:44:55.200Z'
    finished_at: '2026-08-22T12:45:07.334Z'
    artifact_digest: 1a5e82d0159e87dfe4feeaee8d4b2807862956b364c66a8c7dd617d1a0682a49
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12134
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a4920166da288ac257f7fb88
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:06:47.675Z'
    finished_at: '2026-08-22T21:07:01.524Z'
    artifact_digest: b7b647cf5843bd801cae97dab89ae82d46a2bf4476535d3216ada1bbfdac714b
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13849
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ff312f45b5dd7286445013bf
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:33:36.454Z'
    finished_at: '2026-08-22T21:33:49.810Z'
    artifact_digest: d4819e032d4ff78fccac76fe49fe69f14218326c15f0b19e9df50423ed276adb
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13356
  - version: kibi.verification-receipt.v2
    receipt_id: VR-38ab16608310d7d70d9c39c3
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:03:38.091Z'
    finished_at: '2026-08-22T22:03:50.690Z'
    artifact_digest: f212c6182c4ec12b5fda157a3943b1d38541e48ca82d0ce3238673373d8d768b
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12599
---
Covers canonical inline marks and tokens, exact proof ratio semantics, sequential earliest-blocker gate counts, accessible status text, responsive and print styling, self-contained output, and the generated branded SVG badge with Codecov-style chrome and a compact kibi label beside the logo.
