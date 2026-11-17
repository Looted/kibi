---
title: Shell in-place edit detection
status: passing
priority: must
verification_scope: end_to_end
tags:
  - hooks
  - agent-core
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-shell-edits-count
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T17:02:43.765Z'
id: TEST-agent-hosts-shell-edits-count
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8d17706420d4067c4b2f35a4
    test_id: TEST-agent-hosts-shell-edits-count
    scope: end_to_end
    outcome: passed
    code_snapshot: 8db8fce042e72216d5276fa4e1e1bd7d21c7fbc5fb3bd1257337302f146494a6
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T17:08:09.513Z'
    finished_at: '2026-11-17T17:08:09.687Z'
    artifact_digest: 7ad3def2fb37da6069262f40674a0c3e446527aefbacb70c8732ed1ed4e469fd
    contract_hash: 9a40d9624ea126d020318082e716ed061048e6fa4cf8024f6945f863dd1d415e
    binding_hash: 4d80d4c93ce1485c0321ccf06b3e5d54d33caf22b0a889421f709a0bc828d018
    fingerprint: 8c1895066a449f69bc483d2f8a0f1002900b5aa339156cccd7fe47ab2ee1ac08
    fingerprint_components:
      contract: 9a40d9624ea126d020318082e716ed061048e6fa4cf8024f6945f863dd1d415e
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
      - symbol_id: SYM-test-agent-hosts-shell-edits-count
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the shared shell edit parser every host hook uses on in-place edits (sed -i, perl -i, redirections, tee, bash -c scripts as a string and as argv) and on reads and other tools (packages/agent-core/tests/bash-command.test.ts).
