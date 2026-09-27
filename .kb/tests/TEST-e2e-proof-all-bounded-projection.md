---
title: Installed public prove-all excludes large unrelated archived test metadata
status: active
tags:
  - proof
  - consumer
  - projection
  - e2e
text_ref: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-e2e-proof-all-bounded-projection
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-proof-all-bounded-projection
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-proof-all-bounded-projection
    target: default
    native_id: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts::selects the sole proof contract without materializing 500 large archived test records
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1cdb316f047fb53584bca278
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: 3fb5dd53b7476da340d2b3067c5b7b28fa85705ecda8c7da9a92a5fd71df7fd9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T17:53:48.967Z'
    finished_at: '2026-09-26T18:29:22.028Z'
    artifact_digest: c92dba72a3f909a8f796fa7658e27145e47f54eb60fc6fc4365f362bdd0b3f04
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 9c317aae2d5230ab825fdc56a1b09029dd05d98b0a1181d462f6a441e9690587
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-859e427da0ba7230cb69bb8e
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: 279c75d5e89a7f57373d2a99f32dc668cce54b9c7c454df115722fcb2088762d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T21:19:41.697Z'
    finished_at: '2026-09-26T21:51:59.383Z'
    artifact_digest: ea2ec21bf8ebe523493b8797005c5699ed64e6437a611a7893219d88cbebb0b2
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 9c317aae2d5230ab825fdc56a1b09029dd05d98b0a1181d462f6a441e9690587
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8bb2fe39a379382df4ebe922
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: dd570855ae419209361167772401788be6d17ae147c25dff13ad1e92daed3d43
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T10:17:38.192Z'
    finished_at: '2026-09-27T10:52:33.895Z'
    artifact_digest: 2200dffdd4f1cf4aab062fe2f655a48a020797a1661bde4140baa964edd0aa71
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 9c317aae2d5230ab825fdc56a1b09029dd05d98b0a1181d462f6a441e9690587
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0a84e801c71577ddb0d6d12e
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: f7be4ad7689f79542c901c3d4abd17321b2de74dc5a42a4f3e181fa4388301fb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T11:03:41.438Z'
    finished_at: '2026-09-27T11:38:11.633Z'
    artifact_digest: d6ba04f64f847cb08f207889bbb37118a5a1399f665d6b626f1d259ddce79b44
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 9c317aae2d5230ab825fdc56a1b09029dd05d98b0a1181d462f6a441e9690587
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7345b11c8b22c616744cd984
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a4d33ffc576a16f68e502d3a2086100380f23d54976de35dc5e2a45e95ffcd0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T12:49:03.127Z'
    finished_at: '2026-09-27T13:19:49.486Z'
    artifact_digest: 6d59b3c0049b625c1357bc0c860f9fc1e736c49f0b21fc69f54c7272cca053c2
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 9c317aae2d5230ab825fdc56a1b09029dd05d98b0a1181d462f6a441e9690587
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a514d903e7d775cc8bf8f7c5
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: failed
    code_snapshot: a361b52b0d0775e8325f552074cf597e97d80db0c87862e4587aa9a7e6566443
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T13:56:20.135Z'
    finished_at: '2026-09-27T14:26:19.793Z'
    artifact_digest: dd971309fdc9c25544f540172370efc88bd0d4f9343611f5e433eb3ada4a6eda
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 9c317aae2d5230ab825fdc56a1b09029dd05d98b0a1181d462f6a441e9690587
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-266da962cb470fd88c564bdb
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: a361b52b0d0775e8325f552074cf597e97d80db0c87862e4587aa9a7e6566443
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T14:33:50.871Z'
    finished_at: '2026-09-27T15:09:25.713Z'
    artifact_digest: f3ae06be26a83ac2e739789620a1629553eb1143c04e4905884f4cb358f2d71b
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 9c317aae2d5230ab825fdc56a1b09029dd05d98b0a1181d462f6a441e9690587
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
