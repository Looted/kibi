---
title: Briefing surfaces stay retired across shipped artifacts
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-briefs-retired
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-briefs-retired
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cbadc08822efd77b88226c2e
    test_id: TEST-e2e-briefs-retired
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: e20cf45e6aacdf3a6709054f6112f73e51c661df0563df45e5532e5ee96abee4
    binding_hash: efe6236e0dbef576c3f91b079f430dbc0cbec9457b9b9ca63f29da4bf3c926a2
    fingerprint: 26462f3b09fd2e7cd1c7772ee6a7913f9a82c2c51c81468eecc96ba1e4a17ae4
    fingerprint_components:
      contract: e20cf45e6aacdf3a6709054f6112f73e51c661df0563df45e5532e5ee96abee4
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
      - symbol_id: SYM-e2e-test-briefs-retired
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fcd56ec9e49fcf68e4032b71
    test_id: TEST-e2e-briefs-retired
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: e20cf45e6aacdf3a6709054f6112f73e51c661df0563df45e5532e5ee96abee4
    binding_hash: 3da9b9c399db9351d6481442c83512d2d437462b30e5f99ffb173770b63dff5c
    fingerprint: 26462f3b09fd2e7cd1c7772ee6a7913f9a82c2c51c81468eecc96ba1e4a17ae4
    fingerprint_components:
      contract: e20cf45e6aacdf3a6709054f6112f73e51c661df0563df45e5532e5ee96abee4
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
      - symbol_id: SYM-e2e-test-briefs-retired
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Packed end-to-end regression for briefing surfaces stay retired across shipped artifacts.
