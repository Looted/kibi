---
id: TEST-kibi-distribution-parity-matrix
title: Source, packed, dogfood, and pinned distribution parity tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-distribution-parity-matrix.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PARITY-20260810-01
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/distribution-parity-matrix.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 967625f2316fe19a8fcffb70cf4586a4da1eb6f0bbaa72861d2c2e2ccabf1639
    environment_hash: 637756e81846b777cf85b7133d405ff21179312077ee36a2c634adfae3e29c8f
    started_at: '2026-08-10T20:21:47.768Z'
    finished_at: '2026-08-10T20:23:02.743Z'
    artifact_digest: 6305e619b24a6c1b643db11f0de69573cd5815216705927a26bb7486f5209f7d
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ad086ae92e678d9bae321d3d
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: dbc757bfce932c33d6f4be44a7129ba4fdaabbff14d69010dac1da2029bcaefd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:01:07.291Z'
    finished_at: '2026-08-16T19:02:21.468Z'
    artifact_digest: 4d5c1bb18d66e971fbc1d40f835ad6d3fbaa121f54ae65155f8a67f72df01415
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 74177
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ab61bbdf736be44261150cd6
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:20:07.961Z'
    finished_at: '2026-08-16T21:21:22.054Z'
    artifact_digest: f6194099e5bc075656058fff8df3efc4e5c52b16e2a41673ea7272e49a98b14d
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 74093
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c450d7974475e86c9047f833
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:45:47.072Z'
    finished_at: '2026-08-16T21:46:57.765Z'
    artifact_digest: 0eadbe486191c269a4d12c274618ed4bbeb2e7b3037d51f9a933a229fe385854
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70693
  - version: kibi.verification-receipt.v2
    receipt_id: VR-940d8b465791726de3587940
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:08:02.318Z'
    finished_at: '2026-08-17T12:09:09.609Z'
    artifact_digest: f4daa7afcd418a28aa63f1afeaadfd3e0c73d798eba1f2fc203455e3596fcd47
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67291
tags:
  - parity
  - distribution
  - dogfood
  - packed
  - cli
  - mcp
  - e2e
links:
  - type: validates
    target: SCEN-kibi-distribution-parity-matrix
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-distribution-parity-matrix
  required_case_symbols:
    - SYM-test-packed-distribution-parity
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises `kibi.distribution-parity.v1` through source and freshly packed CLI/MCP binaries, then optionally through the binaries actually resolved by audited projects. The fixture set checks proposition ingestion, source-bound contradiction witnesses, conservative proof stages, dependency-ordered repair plans, snapshot-bound receipt gaps, and telemetry acceptance. Align is expected to resolve this checkout and match; BizzWords' older pinned CLI/MCP capabilities must be reported as unsupported rather than silently passing, with a named upgrade action for each divergence.
