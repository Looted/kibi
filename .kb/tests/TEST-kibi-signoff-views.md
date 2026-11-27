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
    receipt_id: PR-c629c231f8d062a16502b022
    test_id: TEST-kibi-signoff-views
    scope: end_to_end
    outcome: passed
    code_snapshot: 60d395be019e9a2a7e51c59ea05f06a97cb442526eac2d365ae6b510d12c7327
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T12:06:43.874Z'
    finished_at: '2026-11-26T12:08:43.788Z'
    artifact_digest: fa036bbda5ccebc258299bb6b6a9b6fd7963ac66740262d7c1918488c5814bd0
    contract_hash: 302c7100c521246af632a6fcdfbb60b0f6891e594895a78a316924219410ba0a
    binding_hash: 010677b711a50d91e129d9dfcc9e93ae33fd3c40ac9adcac321e3fa7f8f633e0
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