---
title: Consumer CLI upserts record agent origin, keep it on later writes and flag uncorroborated approvals
status: passing
priority: must
tags:
  - origin
  - provenance
  - approval
  - upsert
  - checks
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-entity-origin-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-entity-origin-cli
    target: default
    native_id: packages/cli/tests/consumer/entity-origin.test.ts::entity origin through the kibi CLI::records agent authorship on upsert, keeps it on later writes, and flags uncorroborated approvals
    source_file: packages/cli/tests/consumer/entity-origin.test.ts
    line: 55
origin:
  kind: agent
  recorded_at: '2026-10-04T04:43:15.756Z'
id: TEST-kibi-entity-origin-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d3ab7df6a89b3cc02e9dc291
    test_id: TEST-kibi-entity-origin-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 43675d5112431d4f3e5766d7fd142174b14e417e9c8b3d76bc67f23dfa7c508e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T20:09:30.669Z'
    finished_at: '2026-10-24T20:09:39.303Z'
    artifact_digest: 44620a05cdc1796544ab9a3b31a628d7d98938c2d1b5d589a63d015d1de46739
    contract_hash: 93392f102dc3a63c152c0010a91e9c393b3fbfa8c87669c93e49916a8a0739b4
    binding_hash: 8d16868413583b9f60831a4fc00410f6e958deeb6d6464ecdc4ac6ccc8ff19d7
    fingerprint: 669517221cc261324725b67cfb7347ee537ca199850bfd5da71ec452346e9ea6
    fingerprint_components:
      contract: 93392f102dc3a63c152c0010a91e9c393b3fbfa8c87669c93e49916a8a0739b4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 8c1a75230782c94ad10ad1e970b467bb7d70ec24f736f5834c6e878f5d884459
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-entity-origin-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Consumer CLI upserts record agent origin, keep it on later writes and flag uncorroborated approvals

Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/entity-origin.test.ts`).

- A requirement upserted without an origin is stored with `origin.kind: agent` and its write time, read back through `kibi query`.
- A later upsert that omits the origin changes the requirement but keeps who authored it.
- An origin with an unknown kind or field is rejected before anything is written.
- A supplied origin is stored as given, with the write time filled in.
- Of two agent-written exceptions that name a human approver, only the one whose approval is not corroborated (`origin.approved_by` plus the decision record in `approval_ref`) is reported as self-attested, and agent-authored requirements no human approved stay listed.
- All of these are `kibi check` advisories; none is a blocking violation.
