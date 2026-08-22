---
id: TEST-kibi-proposition-complete-ingestion
title: Proposition-complete ingestion boundary tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/e2e/packed/proposition-complete-ingestion.test.ts
tags:
  - requirements
  - semantic-inventory
  - cli
  - mcp
  - sync
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PROPOSITION-20260810-01
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/proposition-complete-ingestion.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 3575856c125e0c295553661a049c7eafef56a740e5a03c667dbf6da4b5bea2d4
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T15:56:32.625Z'
    finished_at: '2026-08-10T15:56:59.485Z'
    artifact_digest: 605825cb536c48c4424e00af28978494cc02715fc49e1b0d21fedb11c8d5d0f8
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PROPOSITION-20260810-02
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/proposition-complete-ingestion.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb72a6263ef4b2b7732572082d776c89b90085a1cf4c4ca440ba10fc30df11
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T16:11:44.369Z'
    finished_at: '2026-08-10T16:12:12.341Z'
    artifact_digest: cb2d2d75bf0245becede4de525667fa64ccad9fc0fa2641e518f431d90aa9a3d
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8fe74a21adaf0e9b88d1de2f
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:14:45.080Z'
    finished_at: '2026-08-16T19:15:29.432Z'
    artifact_digest: 9759b78ff5e38abd4defaddedc30f731cbc3dec782d7d8cf83c72ec7394098c9
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44352
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b227bc5dd0ba6816163fceb0
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:23:49.753Z'
    finished_at: '2026-08-16T21:24:28.976Z'
    artifact_digest: 21c88f6aa36a3947700f6c0627e4b3dcbc1867e6db521acb264607bf0d0ecd6e
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39223
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e8604b0a2b59b7807d754eeb
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:49:29.327Z'
    finished_at: '2026-08-16T21:50:09.543Z'
    artifact_digest: 09a3e1511f7df42a3bb0c910bd11d00a06486fb8a577ba3b4a18a37785bde871
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40216
  - version: kibi.verification-receipt.v2
    receipt_id: VR-27c1533f3009f9a96c656e14
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:11:26.216Z'
    finished_at: '2026-08-17T12:12:02.726Z'
    artifact_digest: 557d6f52716c3840c75c585e23e8fc49988f343ffff960a6ef56570a5336e3d5
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36510
  - version: kibi.verification-receipt.v2
    receipt_id: VR-61dd56ce7d55b78be4caa0ac
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:03:46.226Z'
    finished_at: '2026-08-17T21:04:24.482Z'
    artifact_digest: badd6906c034b3ca70fe22deb3021b9fcc57707c60686abf1889a07de4a48d94
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38256
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7a316227eca6c2ab7826ce02
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:18:26.012Z'
    finished_at: '2026-08-18T07:19:06.468Z'
    artifact_digest: a0fc974bbdebcaf1a7701706a5467256e52bc8ff87f43811a40768e8da38066d
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40456
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f3512dfbb7170af8f68f6ee6
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:46:05.802Z'
    finished_at: '2026-08-18T10:46:46.842Z'
    artifact_digest: 27606dbc87e360da3dfa8f87139790948ce52df9267c30fdce79c915677dd6f0
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41040
  - version: kibi.verification-receipt.v2
    receipt_id: VR-98c6c35db057ef26a88038de
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:54:31.112Z'
    finished_at: '2026-08-21T21:54:41.054Z'
    artifact_digest: 753c4123504ec1edb3901c228f7f502723d316778edd516b77fde1550e954ea4
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9942
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a4f779f2e28db8cc272782b1
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:09:54.124Z'
    finished_at: '2026-08-21T22:10:03.275Z'
    artifact_digest: 4c11ac6afe0f29eb4f2efdaf396d4846dc18ffee7f46598da49298ab2b705849
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9151
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d597fb1859c00f19c8b6fbf6
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:00:58.914Z'
    finished_at: '2026-08-22T01:01:11.446Z'
    artifact_digest: ba116d28bdd57915d87dfd9c28d7bbc9ba07214915f08d68f404679e5823d9d4
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12532
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4d4ba5240237fd478575776d
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:02:21.795Z'
    finished_at: '2026-08-22T08:02:31.786Z'
    artifact_digest: b5438c9a80dd9f064e0edbf5f23dada9f92685944c25ef40059a7bec56ea37b0
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9991
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d9738ed3d4f0c924cf48a428
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:50:48.078Z'
    finished_at: '2026-08-22T09:50:57.050Z'
    artifact_digest: b9ab5ea6c28939cf46e44ffed41973f39f4ed230aef794cceea4b4895c34b238
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8972
links:
  - type: validates
    target: SCEN-kibi-proposition-complete-ingestion
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-proposition-complete-ingestion
  required_case_symbols:
    - SYM-test-packed-proposition-ingestion
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises the packed CLI from an isolated consumer installation. The suite proves direct preflight rejection, post-baseline Markdown rejection for a new incomplete requirement, and successful ingestion of the same prose when it carries the exact advisor-compatible version, source hash, claim key, role, status, and UTF-8 span. Unit and parity suites additionally cover duplicate identities, explicit unresolved states, exact grounding claim keys, modeling-plan completeness, and schema preservation.
