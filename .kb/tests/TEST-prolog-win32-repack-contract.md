---
title: swipl-windows-repack contract tests cover the PE audit, import allowlist, trim pins, manifest prebuilt block, and tar layout
status: passing
sourceFile: scripts/tests/swipl-windows-repack.test.ts
origin:
  kind: agent
  recorded_at: '2026-11-20T11:03:08.872Z'
id: TEST-prolog-win32-repack-contract
type: test
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-win32-repack-contract
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e81e1764ed48b0ad82b576dd
    test_id: TEST-prolog-win32-repack-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: fa8ed7e7a47f3e29e4608719b727382d5d43637c25a9ac83c462a3b83358530b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T13:48:00.031Z'
    finished_at: '2026-11-20T13:48:01.072Z'
    artifact_digest: ec1a177f8bdd3b1db49cb3bce5a125470c6376161e730fd2c3492ef3c775538e
    contract_hash: a0165df8346c9ea732cbeb5fa2c25d16e1461734ed8b3c64d79e7dc7e53b95d2
    binding_hash: 860960bfa1cbfd2171815225b52ea087eb3dc03a4aad6896af0dc343c18c182a
    fingerprint: 5e7ee3be1c6359e44b88e00e32685f070112981f4cecb32f5920ce70d363148d
    fingerprint_components:
      contract: a0165df8346c9ea732cbeb5fa2c25d16e1461734ed8b3c64d79e7dc7e53b95d2
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
      - symbol_id: SYM-test-prolog-win32-repack-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
scripts/tests/swipl-windows-repack.test.ts builds synthetic PE fixtures and covers the machine check, the import allowlist, the missing-trim-path failure, the checksum refusal, the manifest fields, and the tar layout and modes, without network access.