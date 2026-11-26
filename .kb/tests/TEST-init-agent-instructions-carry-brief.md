---
title: kibi init's AGENTS.md section carries the session brief's steps, with and without Git
status: passing
priority: should
tags:
  - init
  - session-brief
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-instructions-mutation
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-26T11:41:54.268Z'
id: TEST-init-agent-instructions-carry-brief
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4b2b4bd9dfdc6523153fba36
    test_id: TEST-init-agent-instructions-carry-brief
    scope: end_to_end
    outcome: passed
    code_snapshot: 3a2ac7b7dfe8d3763962477b10e9b0536e0a559fbf3caa10ce8b5ebbff20d1ad
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T11:52:03.864Z'
    finished_at: '2026-11-26T11:52:03.984Z'
    artifact_digest: 96d3ff0386b91487b7946c6d004ca2cfecadba31aedc9f0327422ae9b715fbef
    contract_hash: 3f62c8c3a02a922e0ad2fc91cb4fefafa05bceb9e44f0e3cc5d76eaa0b1d0811
    binding_hash: 8d6b73a033ddc75c5a21e28a8ed8897fdc1ee1443fcdd38bc16827e591711502
    fingerprint: 78fbfab3a2476c87ac1c4a61a3711acc986e010ba44c51ce88eb14384c6b907c
    fingerprint_components:
      contract: 3f62c8c3a02a922e0ad2fc91cb4fefafa05bceb9e44f0e3cc5d76eaa0b1d0811
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
      - symbol_id: SYM-test-agent-instructions-mutation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Builds the managed AGENTS.md section with agentInstructionsFor for a workspace with Git and one without (packages/cli/tests/commands/agent-instructions-mutation.test.ts) and asserts that each change step of that workspace's session brief from kibi-agent-core appears as its own line, unchanged and in order, followed by the lines on whom to ask, firm-code edits, committing and the kibi-usage skill; that the version without Git names no --staged check; and that a section rewording a step no longer holds the brief. packages/agent-core/tests/session-brief.test.ts pins the brief's own steps. A false pass would need a brief whose steps the section copies while the brief itself says something else, which the second file rules out.
