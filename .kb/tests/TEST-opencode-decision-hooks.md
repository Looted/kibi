---
title: OpenCode decision hooks and plugin wiring
status: passing
priority: must
verification_scope: end_to_end
tags:
  - opencode
  - hooks
origin:
  kind: agent
  recorded_at: '2026-11-17T17:01:50.759Z'
id: TEST-opencode-decision-hooks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-opencode-decision-hooks
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5d99407a2a25ea13b307e690
    test_id: TEST-opencode-decision-hooks
    scope: end_to_end
    outcome: passed
    code_snapshot: 8db8fce042e72216d5276fa4e1e1bd7d21c7fbc5fb3bd1257337302f146494a6
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T17:08:06.573Z'
    finished_at: '2026-11-17T17:08:06.694Z'
    artifact_digest: 4b49ba9041ad3b4c524054b3254435befb517e9319f9d836ea40ec91286b8fa0
    contract_hash: d40094ec12c5f87230ccf15a911b8d09981dfe6481950a4bb4e7b5c333d6172f
    binding_hash: 0e04b16c5051f89e4baf5f334109531ba97399867290ebc8dc02bc3435df8d9a
    fingerprint: 7d577cf2c82e21577b259a44926c659ffac83786a6a8cfa47a9bde068963ea66
    fingerprint_components:
      contract: d40094ec12c5f87230ccf15a911b8d09981dfe6481950a4bb4e7b5c333d6172f
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
      - symbol_id: SYM-test-opencode-decision-hooks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Drives the OpenCode decision hooks and the plugin hooks chat.message, tool.execute.before, tool.execute.after and session.idle in a temporary Kibi workspace with a firm requirement: the rule note and capture template after the first source edit, the firm-edit stop once per requirement per session, the idle capture and signoff requests, rules recorded through the CLI or any server key, and no hooks in a workspace without Kibi (packages/opencode/tests/decision-hooks.test.ts).
