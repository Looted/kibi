---
title: kibi CLI --json alias and --format conflict tests
status: passing
priority: should
verification_scope: end_to_end
verification_perspective: internal
tags:
  - cli
origin:
  kind: agent
  recorded_at: '2026-11-22T17:42:58.076Z'
id: TEST-cli-json-format-alias
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-json-format-alias
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-115f971752c0a112a251237d
    test_id: TEST-cli-json-format-alias
    scope: end_to_end
    outcome: passed
    code_snapshot: a1a9b7bd9d01e80427c06583c664e504a63b0ff35d6b5dd896bccbe1390d6d25
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-22T17:49:03.746Z'
    finished_at: '2026-11-22T17:49:04.908Z'
    artifact_digest: 15aa67c0de9d485c0013ac715ca448ece36b5b30e495e28f4632b6d0701b2128
    contract_hash: ed4244ff99d4cad64413b6929aec38bc6baab9c970704eb13cad89ecece1d924
    binding_hash: b9e6014e63f3fb782b042a4c631d198dd85b5e706b1cb94c3a3ef85380d83782
    fingerprint: b12efca57b4d0d40890bc05e4d8919e429cab87a2c5fa72aef160332f38753e3
    fingerprint_components:
      contract: ed4244ff99d4cad64413b6929aec38bc6baab9c970704eb13cad89ecece1d924
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
      - symbol_id: SYM-test-cli-json-format-alias
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/cli-json-alias.test.ts` (the alias folds into `format: json` and drops the flag; the guard refuses `--json` with an explicit non-json `--format` and allows `--json` alone, with `--format json`, and with a default format) and `packages/cli/tests/cli-conflict.test.ts` (the real CLI exits 2 with the conflict message for `kibi status --json --format table`).
