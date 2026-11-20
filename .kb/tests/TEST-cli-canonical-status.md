---
title: CLI status tests prove canonical-lane freshness
status: passing
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-canonical-status
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-cli-canonical-status
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f574849b826747c4a19ae598
    test_id: TEST-cli-canonical-status
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 800844a63d8ec3aefbc978a988fdc6eaf6ebcc67b1dd0c31f859c60ed0a67183
    binding_hash: fe966725f8ab4db615cfe9a493a1c7ae28c923dc96ba9aa92573ee9a0fac93d3
    fingerprint: cddff176599e000d40ef51f3e94bf5abdc5460523c2f2cf6375f8f8dc53c08f3
    fingerprint_components:
      contract: 800844a63d8ec3aefbc978a988fdc6eaf6ebcc67b1dd0c31f859c60ed0a67183
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
      - symbol_id: SYM-unit-test-cli-canonical-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
`packages/cli/tests/commands/status.test.ts` proves `kibi status` becomes stale after editing, adding, or deleting canonical `.kb/` knowledge-lane markdown, stays fresh for leftover `documentation/` notes without entity frontmatter, and ignores e2e README files.

`packages/core/src/status.pl` walks `.kb/` knowledge lanes plus leftover `documentation/` (excluding `tests/e2e` and `tests/benchmarks`).
