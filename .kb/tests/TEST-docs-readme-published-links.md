---
title: README and landing page follow the published documentation catalog
status: passing
tags:
  - docs
  - readme
  - llms
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-docs-readme-published-links
      target: default
  success_policy: all_required_first_attempt
id: TEST-docs-readme-published-links
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1a8c71018b36eca675101894
    test_id: TEST-docs-readme-published-links
    scope: end_to_end
    outcome: passed
    code_snapshot: 9769f20f55382c8e5f04bf446aed20670645b310559453eb7f5f821a773d4838
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-29T13:37:31.908Z'
    finished_at: '2026-09-29T13:37:32.506Z'
    artifact_digest: c6f351a404f1bf84263f2483e3a1b7d42963968aa475a6fcfbd0293058fb3400
    contract_hash: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
    binding_hash: d19f57aa1781ff715db5e63bd1c964dfbfca81ca4c5a65e6edb808229b52c6c5
    fingerprint: 5908e8dc8c8404e4b1c81506cd15e3d728d59bfab103cc1227cc2a1d0d8fd291
    fingerprint_components:
      contract: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-docs-readme-published-links
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-477f5313a3341a983048a29a
    test_id: TEST-docs-readme-published-links
    scope: end_to_end
    outcome: passed
    code_snapshot: 4de9b7370f128c6eac0fb5bd08ac24bcf96ed20827923c6249686bd2a8565283
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-29T13:42:36.227Z'
    finished_at: '2026-09-29T13:42:36.460Z'
    artifact_digest: cfcc7fe2cbd8f0d2ec07ececfab1ff15b24389f844da97a7b24e8d3329997e25
    contract_hash: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
    binding_hash: edf672a474d18a50abff7d91a60a787acbe74832b067c8f904206c577e45dea9
    fingerprint: 5908e8dc8c8404e4b1c81506cd15e3d728d59bfab103cc1227cc2a1d0d8fd291
    fingerprint_components:
      contract: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-docs-readme-published-links
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4515565feb119d7eded3a0c6
    test_id: TEST-docs-readme-published-links
    scope: end_to_end
    outcome: passed
    code_snapshot: 5a9ab5593d904e122e0fab9b28e22c126247057a9f1590411f3e86e8b708840e
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-29T14:16:06.789Z'
    finished_at: '2026-09-29T14:16:06.980Z'
    artifact_digest: a267dd83a717c7700eb718614e2df4455b5bcbb35972c0db24efa5c4046a9ed5
    contract_hash: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
    binding_hash: 3eff59d1cce827fde72c8a99cb03e073b8670aed165bc4d70a4b77bad77315ee
    fingerprint: 5908e8dc8c8404e4b1c81506cd15e3d728d59bfab103cc1227cc2a1d0d8fd291
    fingerprint_components:
      contract: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-docs-readme-published-links
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3cf058f2c8bed667f8b1cc98
    test_id: TEST-docs-readme-published-links
    scope: end_to_end
    outcome: passed
    code_snapshot: bc1bca53ca45af57aa701b12ff3b3aebea683330837613f1b9a98c076c03ef6d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T07:35:19.541Z'
    finished_at: '2026-09-30T07:35:19.850Z'
    artifact_digest: e3c48aa9d6d62d1a4cbaa3a39a0178de5398b0217bcded51d7508b06f9ec9b31
    contract_hash: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
    binding_hash: 07cd4feb0f556e09bb1ad6022c12281b4bbbd03f68b2bec0caa828893f220411
    fingerprint: 5908e8dc8c8404e4b1c81506cd15e3d728d59bfab103cc1227cc2a1d0d8fd291
    fingerprint_components:
      contract: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-docs-readme-published-links
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dba38815ba075656594f6f7c
    test_id: TEST-docs-readme-published-links
    scope: end_to_end
    outcome: passed
    code_snapshot: a98f98864bd46257c0faf4b6b4030f2dea8fe8a67e29129519ca140aad401585
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T07:41:43.792Z'
    finished_at: '2026-09-30T07:41:44.290Z'
    artifact_digest: 98a6853ab61bd891b58a89609f190a71c66b282145d5728059518042a09100ee
    contract_hash: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
    binding_hash: f71ae7aa35ba4dadf4ddbb4de52b43d8b442461ae1bf465a4db73952c0210043
    fingerprint: 5908e8dc8c8404e4b1c81506cd15e3d728d59bfab103cc1227cc2a1d0d8fd291
    fingerprint_components:
      contract: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-docs-readme-published-links
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-741774cc97b88ddfa66e6d31
    test_id: TEST-docs-readme-published-links
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c84ba3219d4e347c07d76f43d865686c15aa2087b99a968098bbbf35dac4ada
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T11:26:08.244Z'
    finished_at: '2026-09-30T11:26:08.749Z'
    artifact_digest: 0517bf21b141b0e5e9562c3d0ca5700456923aabca974c6e513c64787a9f3ced
    contract_hash: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
    binding_hash: bdc8788692c1e18b660987c6ceb839f31894799712881cf04fcaf97cc11c98d4
    fingerprint: 5908e8dc8c8404e4b1c81506cd15e3d728d59bfab103cc1227cc2a1d0d8fd291
    fingerprint_components:
      contract: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-docs-readme-published-links
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
