---
title: Snapshot-bound source analysis and installed multilingual ownership checks
status: active
tags:
  - multilingual
  - source-analysis
  - v2
  - e2e
  - consumer
text_ref: documentation/tests/e2e/packed/multilingual-source-analysis.test.ts; packages/plugin-sdk/tests/sdk.test.ts; packages/plugin-builtin/tests/builtin.test.ts; packages/cli/tests/plugins/source-analysis-v2.test.ts; packages/plugin-treesitter/tests/plugin.test.js
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-source-analysis-v2-contract
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-multilingual-source-analysis
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-multilingual-source-analysis
    target: default
    native_id: documentation/tests/e2e/packed/multilingual-source-analysis.test.ts::passes a baseline, rejects an unowned declaration, and accepts its authored owner in Python, Go, and Rust
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9eb9f776dbbf71e83eb8b600
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 3fb5dd53b7476da340d2b3067c5b7b28fa85705ecda8c7da9a92a5fd71df7fd9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T17:53:48.967Z'
    finished_at: '2026-09-26T18:29:22.028Z'
    artifact_digest: c92dba72a3f909a8f796fa7658e27145e47f54eb60fc6fc4365f362bdd0b3f04
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: ceda17aec6955a1d6ef4311a8872d0489105634f7d9027bbf47f21939a886c9b
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e572ec1c6fa989731707aa84
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 279c75d5e89a7f57373d2a99f32dc668cce54b9c7c454df115722fcb2088762d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T21:19:41.697Z'
    finished_at: '2026-09-26T21:51:59.383Z'
    artifact_digest: ea2ec21bf8ebe523493b8797005c5699ed64e6437a611a7893219d88cbebb0b2
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: ceda17aec6955a1d6ef4311a8872d0489105634f7d9027bbf47f21939a886c9b
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7adf570bc51f4ecb57a00e69
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: dd570855ae419209361167772401788be6d17ae147c25dff13ad1e92daed3d43
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T10:17:38.192Z'
    finished_at: '2026-09-27T10:52:33.895Z'
    artifact_digest: 2200dffdd4f1cf4aab062fe2f655a48a020797a1661bde4140baa964edd0aa71
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: ceda17aec6955a1d6ef4311a8872d0489105634f7d9027bbf47f21939a886c9b
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ff507efdb72e3d0055268d56
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: f7be4ad7689f79542c901c3d4abd17321b2de74dc5a42a4f3e181fa4388301fb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T11:03:41.438Z'
    finished_at: '2026-09-27T11:38:11.633Z'
    artifact_digest: d6ba04f64f847cb08f207889bbb37118a5a1399f665d6b626f1d259ddce79b44
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: ceda17aec6955a1d6ef4311a8872d0489105634f7d9027bbf47f21939a886c9b
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7944a487f521a497af846cb6
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: failed
    code_snapshot: 39ed85118d250bd2a174df1470b9e719eddea4ec27ccaf9e8f821beb57e40d29
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T11:20:25.227Z'
    finished_at: '2026-09-28T11:41:43.503Z'
    artifact_digest: f0b89cea9d05ed19dfe6b7af6e0e61e449561a983432945f8d7e630e16ff97a4
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: 71a283ac87278425fbccab06c76e213b037038333515f8cca7a6e78a1c092215
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +110 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f64886d3cc65972b10c56ab8
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: 1b08268deef468831dbad97927562b37681b0100fd310c2902d7c856c3779e89
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-476e05776d785d960f133440
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: b419f9368d49af6517bf1776ba3e4db534975f0977a1eeec3c3792e44a28a820
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b0ae11e50052b1e38a7e23ae
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: b419f9368d49af6517bf1776ba3e4db534975f0977a1eeec3c3792e44a28a820
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-34e6e819f1c1e18bd7c8b8a5
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: c700b84f9d8a3ec6d6ac80997014e7f27ec84ca8ea6c5ed298f3d6ff7086b4cb
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
