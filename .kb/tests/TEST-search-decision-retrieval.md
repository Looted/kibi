---
title: Scoped decision retrieval tests
status: passing
priority: must
tags:
  - search
  - retrieval
  - agent-core
  - unit
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:56.518Z'
id: TEST-search-decision-retrieval
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-search-decision-retrieval
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0808dd0094d370879446f793
    test_id: TEST-search-decision-retrieval
    scope: end_to_end
    outcome: passed
    code_snapshot: c955bf98fb456cc02c6e8a437c7faec3c7a0ab4eca33f367809f4db5b50d1750
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T15:09:42.490Z'
    finished_at: '2026-11-25T15:09:43.588Z'
    artifact_digest: 5de30bbeb11f23c272e4f942738f7216d3738e6530c40e1fe247146d2caab800
    contract_hash: 62e928a1d6b4d83a978ef20aab40356a587e3d9dfeb52ba508caa347ed83067f
    binding_hash: ce7386f166eaa78631e7361f63e7112b0b83671898857dfe01e9fc598eb1ebef
    fingerprint: 850d907efb13636ff02079fd01b468d77b36b6f8d315101b754f62dddb785fd7
    fingerprint_components:
      contract: 62e928a1d6b4d83a978ef20aab40356a587e3d9dfeb52ba508caa347ed83067f
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
      - symbol_id: SYM-test-search-decision-retrieval
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs packages/agent-core/tests/retrieval-contract.test.ts end to end over this repository's own knowledge base (a plain question finds the governing decision as one short card, decisions linked to files here are in scope and move out when the files are missing, decisions in another scope are only counted, a superseded decision never leads a card, and unknown question words are listed), then packages/agent-core/tests/retrieval.test.ts (scope tiers from links and knowledge sources, the unscoped and distant demotions, decisions in another scope only counted, uncovered question words, fused vector scores, edited-symbol owners and nearness, the relevance slot, statuses and supersession chains, near-identical titles folded unless firm or of opposite polarity, ties ordered by id, and the one-line card at most 300 characters) and packages/agent-core/tests/retrieval-tokens.test.ts (plurals, stems, identifier words and question scaffolding).

A false pass would be a fixture whose decisions all sit in one tier, so the demotions and the count of other scopes are never exercised.