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
    receipt_id: PR-3dda7773c71537cf0c766028
    test_id: TEST-agent-hosts-rule-reason-capture
    scope: end_to_end
    outcome: passed
    code_snapshot: a6e9d57ef28fbd778b65101c3678e2fbdc990bc4b45f0eb1a7b6111c71e2a124
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T19:10:28.492Z'
    finished_at: '2026-11-25T19:10:31.710Z'
    artifact_digest: ef3abad1171988751e95533d2dd38656b1de1bd7c6e14d31769753a6e611661f
    contract_hash: ece754f2da91092e32cfd2789f6009ad5c877be637defc9c36c873cb818dcf7c
    binding_hash: 2ac5e14a3be78f5f7b833a07591d2f103637c85104722f37f1eaf6bd980a3b9e
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