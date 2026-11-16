---
title: Rule reason capture hook tests
status: active
priority: must
verification_scope: end_to_end
verification_perspective: internal
tags:
  - hooks
  - decision-capture
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-rule-phrase-detection
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T16:17:33.817Z'
id: TEST-agent-hosts-rule-reason-capture
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-616e78572621ad67082c5ee3
    test_id: TEST-agent-hosts-rule-reason-capture
    scope: end_to_end
    outcome: passed
    code_snapshot: fb244d1bf2117dfd820b261a8c69ee5fb182f5687d2d93602fd19c55cc5677eb
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T17:04:54.520Z'
    finished_at: '2026-11-16T17:04:58.415Z'
    artifact_digest: 6a829b42f5c5dad1622f96ce61e13c7bb29c826caf85b59c0f5e8177522ca550
    contract_hash: ece754f2da91092e32cfd2789f6009ad5c877be637defc9c36c873cb818dcf7c
    binding_hash: 06f150d7ae6f74ccb5188df59bc5ccbdbc402dd7db18e399c9db25e44af8f0f9
    fingerprint: 44073919036ec508fd8f1057e67f710a78e507a11a3d23bbf076f0ad4cae3ef4
    fingerprint_components:
      contract: ece754f2da91092e32cfd2789f6009ad5c877be637defc9c36c873cb818dcf7c
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
      - symbol_id: SYM-test-agent-hosts-rule-phrase-detection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The decision guard tests read the because or so that clause of a rule prompt and check the rule note and the capture template, with its why field; the Claude Code, Codex, Cursor and Z Code hook tests check that each host's rule note and template ask for the stated reason.