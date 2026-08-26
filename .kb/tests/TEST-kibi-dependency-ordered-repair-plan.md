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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8cff93047542a425491619da
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
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:05:00.216Z'
    finished_at: '2026-08-22T21:05:14.914Z'
    artifact_digest: 1840c70abbad92f74eaaf605e15a8ce2cd0360d88f82de5868f049a469229a8a
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14698
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d6b39be385d66abf565f3495
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
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:31:40.650Z'
    finished_at: '2026-08-22T21:31:54.449Z'
    artifact_digest: daa2a0896ee64cae502a665e1a4c48d97388b295cb76b09a1d0a24a62929551d
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13799
  - version: kibi.verification-receipt.v2
    receipt_id: VR-feefc418e68b105c129b8c5e
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
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:01:58.821Z'
    finished_at: '2026-08-22T22:02:11.973Z'
    artifact_digest: d242db3ee56cc705936c77718368e76b5a06ffdf2e95cb8b631cf54d1ba67506
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13152
  - version: kibi.verification-receipt.v2
    receipt_id: VR-637e7d44c3a349de13b6987b
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
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:31:53.519Z'
    finished_at: '2026-08-23T07:32:06.270Z'
    artifact_digest: 3d21c1869e36364c66bc619ffe5b1b63dc30f2fe8d485ae558a9c17f9ceec3ab
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12751
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d2e8a5a6bb05c77d5a7f1029
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
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:15:32.175Z'
    finished_at: '2026-08-23T08:15:45.497Z'
    artifact_digest: b3db50f62a36b6c2b3e95a8598b7f68fe9aba2c8ab7544de908f2e3c851dddb3
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13322
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5c24bda0a700236348773415
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
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:12:40.665Z'
    finished_at: '2026-08-23T12:12:52.826Z'
    artifact_digest: 7975bf2418ce0e9223d3f6613d39e1bd0715f3608cd2d5b5ea6579f14453d9cc
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12161
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f415251bdab1e68d6431b665
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
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:12:28.354Z'
    finished_at: '2026-08-23T19:12:40.827Z'
    artifact_digest: c8cdedd7c25a5750092594268247b3167f7ac9b20deb0a6c34910d81b00719f8
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12473
  - version: kibi.verification-receipt.v2
    receipt_id: VR-be832ca6bdf87fe61ee708d9
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
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:38:38.440Z'
    finished_at: '2026-08-23T19:38:51.383Z'
    artifact_digest: 30f2190ee1ea4ec2d11453f76cb63306ee6d7c95c7283cd4a8b9fe83d460a9c9
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12943
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8c0e540f35c54b493689ae87
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
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:06:33.825Z'
    finished_at: '2026-08-23T20:06:46.751Z'
    artifact_digest: 05072cbc75f11e473505f6d113ee01330b0f4266a8f099875fb94ac7cf2292e0
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12926
  - version: kibi.verification-receipt.v2
    receipt_id: VR-36a5b38a9a8929056bbde028
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
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:32:52.767Z'
    finished_at: '2026-08-23T20:33:05.428Z'
    artifact_digest: d0882f0740dfbc4fffb15e8d6e960ec98a58a32d1f96a5b2a601f8e23049da28
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12661
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b4c7778f7305e8504e45a689
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
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:13:43.884Z'
    finished_at: '2026-08-23T22:13:55.944Z'
    artifact_digest: 24d3b72cc100b5ad64a5974e7db1b4954b6bc4c1c55d1859bc07cb55949d66de
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12060
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3168a688da60c288d54fc7f8
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
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:39:54.425Z'
    finished_at: '2026-08-23T22:40:06.557Z'
    artifact_digest: 4ce3bf1882279208b9ba223a6f5c82a6cde17fb7f989f27c357929bf63fef9d2
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12132
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9430842e5b23d18b1b5906fd
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:25:22.703Z'
    finished_at: '2026-08-24T06:25:36.123Z'
    artifact_digest: f9497d2b4e7249dc19255fbee1a3292e66e1d06f2ec23e87d6b6e0895206a43e
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13420
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9adcee4211c325952d9ac287
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:53:21.026Z'
    finished_at: '2026-08-24T06:53:33.822Z'
    artifact_digest: fd4148e0b824954a3f8784257974cd0c22343c94b3e9510cdcb61a52f06b5a30
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12796
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d2adcc12cf1ee8761de0fb68
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:23:25.380Z'
    finished_at: '2026-08-24T07:23:38.074Z'
    artifact_digest: 842af05c3d2be9d3c81fe606f569ccb4167f2f8d62b824e8049e8228009e1a60
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12694
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f39601d9f7815b245b6e4ebc
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:48:11.126Z'
    finished_at: '2026-08-24T07:48:24.469Z'
    artifact_digest: 0bc1f45bc8027adedd6414bb33cfa38e8ec69bf809f10362f2a377e4754f30c7
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13343
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3a6fe0b3b02342ed6a13dff5
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:20:29.160Z'
    finished_at: '2026-08-24T08:20:42.502Z'
    artifact_digest: 9fe6aff3c525541a2f6e888385d48de60de524404be219583c1a621f340a687c
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13342
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9956a12cd646da09cbd877e5
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:50:01.372Z'
    finished_at: '2026-08-24T08:50:21.479Z'
    artifact_digest: 32b680dbbffe4ce1714711afd8aebc6b98c7054baba4c3c40707c2e1ea4c133b
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20107
  - version: kibi.verification-receipt.v2
    receipt_id: VR-00c6ef83a4e585797d9c9fb8
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:53:32.095Z'
    finished_at: '2026-08-25T20:53:45.346Z'
    artifact_digest: 853807d5b09114f0ee298137b7ba48680cbf4a86de75729b1e2fa59c0fadd2ac
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13251
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b771bf2633ff07b6fd6765fd
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
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:37:54.143Z'
    finished_at: '2026-08-25T21:39:01.051Z'
    artifact_digest: 67e26961b9d410a87140e1c6a7be787be0cd226efaf1da7d8d16d557427eb14a
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 66908
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4f815fa15c9be0ad96496791
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
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:24:31.833Z'
    finished_at: '2026-08-26T08:25:14.169Z'
    artifact_digest: 8cd44ad136080bd58f71094545127956c1a9da462a07a79c3ac197c431e7822e
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42336
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
