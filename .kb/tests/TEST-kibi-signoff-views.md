---
title: Requirements signoff views through the packed CLI and host integrations
status: passing
tags:
  - cli
  - signoff
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-signoff
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-22T09:25:36.470Z'
id: TEST-kibi-signoff-views
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d75d37331c8ac05045b7633c
    test_id: TEST-kibi-signoff-views
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 302c7100c521246af632a6fcdfbb60b0f6891e594895a78a316924219410ba0a
    binding_hash: ac80352e7ff399b2d64602932ffe1b5f3935a34a2237ccc8e6ef930e953bab26
    fingerprint: eb1828efefe3a43e179e135dd966ec3e83f7f7931a030f4191488d65310f5ee1
    fingerprint_components:
      contract: 302c7100c521246af632a6fcdfbb60b0f6891e594895a78a316924219410ba0a
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
      - symbol_id: SYM-e2e-packed-cli-signoff
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kibi signoff through the installed packed CLI on a sandbox repository: the default Markdown block, the JSON summary with proof state, and a questions file rendered to HTML, checking the files written under .kb/briefs/signoff. The same proof run executes the Claude Code display hook tests, which spawn the bundled hook as Claude Code does, and the OpenCode and VS Code signoff tests for the rendered card, toasts and the webview panel.