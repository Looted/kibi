---
title: Kibi update notice tests
status: active
priority: should
tags:
  - release
  - cli
  - doctor
  - update-notice
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-04T13:23:06.714Z'
id: TEST-kibi-update-notice
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-update-notice-cli
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-58f0ba572908c655154eaaa5
    test_id: TEST-kibi-update-notice
    scope: end_to_end
    outcome: passed
    code_snapshot: 4142c0b519020e506d9c3dbe98f490472107e06ac911593bd1cf57167edf809c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T13:56:46.324Z'
    finished_at: '2026-11-04T13:56:46.574Z'
    artifact_digest: e06fe75ba3a1b24cb776fb6e98bb83c081ad970b0dedefe42e9970a611fde785
    contract_hash: 2c19c661c02bbdaed0b578c694e6cab4bbee1b37fdf9d19e1cc803c1069cc141
    binding_hash: 9eefa9412ff3395415b15dae21ea0f73cf4ad823124d41708ed28d6dce8c84bf
    fingerprint: bbd6be2d853253545ea708b128b523750ce343c39b260f69283c678888455f50
    fingerprint_components:
      contract: 2c19c661c02bbdaed0b578c694e6cab4bbee1b37fdf9d19e1cc803c1069cc141
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
      - symbol_id: SYM-test-kibi-update-notice-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs packages/cli/tests/update-check.test.ts: the notice text, version comparison and update command per install kind; the once-a-day notice and registry check with the cache; silence for JSON output, non-terminal stderr, CI, tests, dev builds and the opt-out variables; the kibi doctor Kibi updates row online, offline and with a newer KB schema; and a real detached background process that fetches the latest version from a local registry and writes the cache. It also pins that kibi-cli's package.json declares the KB schema the CLI writes.