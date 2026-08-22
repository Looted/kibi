---
id: TEST-kibi-dependency-ordered-repair-plan
title: Packed dependency-ordered repair plan tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-dependency-ordered-repair-plan.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-REPAIR-PLAN-20260810-01
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/dependency-ordered-repair-plan.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 68131fba9962716408e6bf6aa60dfc87b86a6c4eacdf83e623edd51ecf2714b8
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: '2026-08-10T18:20:28.253Z'
    finished_at: '2026-08-10T18:20:59.811Z'
    artifact_digest: 1ab7494688bc1609e7ba32a26b73af1ea6c93de6ff4d9316f5c1ae495af940e2
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1f63afee87b3b50448602253
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: dbc757bfce932c33d6f4be44a7129ba4fdaabbff14d69010dac1da2029bcaefd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T18:59:59.477Z'
    finished_at: '2026-08-16T19:00:52.008Z'
    artifact_digest: c0c0899ee014b3f1558a1c75f94f07037c2256ad095a63600d054320018a9e04
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 52531
  - version: kibi.verification-receipt.v2
    receipt_id: VR-015dc33cc3a27cb0ec4261ca
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:19:03.910Z'
    finished_at: '2026-08-16T21:20:01.296Z'
    artifact_digest: 8934e255995df34a2c28c52add9a187737eae45298bf8460db09ee65de73089d
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 57386
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6dbe1996283b7086d7dc0351
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:44:52.886Z'
    finished_at: '2026-08-16T21:45:40.621Z'
    artifact_digest: 11df355c9874a7991fa9a96ee69740c8dbd452f08c47c4706be1fcf787b00fa8
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47735
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d59f884ff691c912760768d5
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:07:17.394Z'
    finished_at: '2026-08-17T12:07:57.859Z'
    artifact_digest: ac6918d5d5b1e88466e3af6c2e4ca51810b243f81e0f348f738272f4cb560e5a
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40465
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ed963ad85a5201f32846351f
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:57:36.890Z'
    finished_at: '2026-08-17T20:58:21.307Z'
    artifact_digest: 63cef9b0a0a24c7d5de4403782d0ae079ff786105bb00746bf00b023adbfcb83
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44417
  - version: kibi.verification-receipt.v2
    receipt_id: VR-eba7cb736c37a5f7715611c7
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:11:54.334Z'
    finished_at: '2026-08-18T07:12:39.903Z'
    artifact_digest: eaeaedb3c0c26558c79dfa21b27f851032b82f2f313eb014663084647bc3a4bf
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45569
  - version: kibi.verification-receipt.v2
    receipt_id: VR-eb1db8752c627313a71d71d9
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:40:23.267Z'
    finished_at: '2026-08-18T10:41:13.552Z'
    artifact_digest: 67582d02a7b4c3b294dee219b46a51692f5ed286d1070dbf562897e2138e4c16
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 50285
  - version: kibi.verification-receipt.v2
    receipt_id: VR-93153df04abae0bf84f65f57
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:51:04.121Z'
    finished_at: '2026-08-21T21:51:19.948Z'
    artifact_digest: 72d3c5716f9448cc5de70a5b23c85fe7ad3805c593d7a31c5f91596ffd549f24
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15827
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a07c2db7021550f7af72208b
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:06:28.929Z'
    finished_at: '2026-08-21T22:06:44.791Z'
    artifact_digest: b7452717f06a671810a10cb6677aae155943088b30d6ce7e972700dd21000420
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15862
  - version: kibi.verification-receipt.v2
    receipt_id: VR-aa195a2ecf5151236a85ffcb
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:56:29.054Z'
    finished_at: '2026-08-22T00:56:50.538Z'
    artifact_digest: 60fba58cd2df0403c2d22bea8ee231c1cbbeaa41971616a5463da238d52fcfb0
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21484
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ae88d6cc08e9f90ebd6d27f3
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:58:51.475Z'
    finished_at: '2026-08-22T07:59:07.187Z'
    artifact_digest: 8203399f07f270726b8f1a8a9a46942357181cd395968702f8fdf7c6107804c9
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15712
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0b945736528ea08696876fac
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:47:04.406Z'
    finished_at: '2026-08-22T09:47:18.929Z'
    artifact_digest: 8de42e9b1a0e78b64c393e1be2c1115d2e2fc2a0e7f70b13dd9f61e9626e3390
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14523
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f7f8e03aa7c68b3105b403f7
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:43:11.810Z'
    finished_at: '2026-08-22T12:43:24.340Z'
    artifact_digest: 576a9c52ae5ccbfe5e2a1040ece7ea4c4c6f5ce99821f5d52eecdd5acbbdc29a
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12530
tags:
  - requirements
  - proof
  - repair
  - migration
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-dependency-ordered-repair-plan
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-dependency-ordered-repair-plan
  required_case_symbols:
    - SYM-test-packed-dependency-ordered-repair-plan
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises `kibi.repair-plan.v1` through a fresh packed CLI installation, including dependency ordering, pagination fail-closed behavior, stable plan identity, requirement-only scope, table rendering, and read-only KB state.
