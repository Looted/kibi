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
    receipt_id: PR-20e6f4df3ded4810eeba86ab
    test_id: TEST-kibi-signoff-views
    scope: end_to_end
    outcome: passed
    code_snapshot: bcb841dd0abcae9dabd73b657221fbb2fe40a69646f6d5a7954feabecdde7d2c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-26T18:27:02.711Z'
    finished_at: '2026-10-26T18:28:23.885Z'
    artifact_digest: c3686fd44c8e553c9b4ff11026047bbe0ec3f10161b51c508b453512eeb9c202
    contract_hash: 302c7100c521246af632a6fcdfbb60b0f6891e594895a78a316924219410ba0a
    binding_hash: 7d280acaeb24b836b91fc8596fe720e553473f5d6d78ea8371e09adcb7ee72be
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