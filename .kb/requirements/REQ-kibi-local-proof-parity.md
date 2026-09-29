---
title: Local proof checks catch the regressions the CI proof gate enforces
status: open
priority: must
owner: proof
tags:
  - proof
  - ci
  - tooling
  - baseline
semantic_text: Maintainers can replay the CI proof gate locally against a clean clone of the committed HEAD. The proof baseline check offers a semantic-only mode that ignores stale proof evidence and still fails on grounding, contradiction, and traceability regressions.
proof_exempt: true
proof_exempt_reason: Repository proof tooling that drives the CI proof workflow itself; verified by the script unit contracts (TEST-kibi-local-proof-parity) and exercised end to end by the CI proof workflow, not by a packed product E2E.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a33d82803501cc7d66c8b1ac2db31adcc2f145bc77e09df7dd0e0da1ad944b95
semantic_inventory:
  - claim_key: CLAIM-DF1C8C7846819DEC
    claim_text: Maintainers can replay the CI proof gate locally against a clean clone of the committed HEAD
    role: descriptive
    span:
      start: 0
      end: 92
    payload_hash: e5275bb8689dd2c977515621902f6e5aaf0899fc5531ebd128076b9543f4e891
    status: ontology_gap
    reason: No predicate or property vocabulary describes repository proof tooling capabilities; the claim is verified by TEST-kibi-local-proof-parity rather than grounded as a fact.
  - claim_key: CLAIM-4270D9C398140B90
    claim_text: The proof baseline check offers a semantic-only mode that ignores stale proof evidence and still fails on grounding, contradiction, and traceability regressions
    role: descriptive
    span:
      start: 94
      end: 254
    payload_hash: e5275bb8689dd2c977515621902f6e5aaf0899fc5531ebd128076b9543f4e891
    status: ontology_gap
    reason: No predicate or property vocabulary describes repository proof tooling capabilities; the claim is verified by TEST-kibi-local-proof-parity rather than grounded as a fact.
logic_claims:
  - CLAIM-DF1C8C7846819DEC
  - CLAIM-4270D9C398140B90
id: REQ-kibi-local-proof-parity
type: req
---
Maintainers can replay the CI proof gate locally against a clean clone of the committed HEAD. The proof baseline check offers a semantic-only mode that ignores stale proof evidence and still fails on grounding, contradiction, and traceability regressions.

## Rationale

Local proof runs used to diverge from CI: nested worktrees resolved the parent checkout's modules and hooks, stale receipts hid semantic regressions behind expected "unresolved" rows, and gates such as `check-generated --staged` did not run on commit. `bun run proof:replay` replays the proof job from `.github/workflows/proof.yml` in a clean clone, and `bun run proof:baseline:semantic` compares the baseline in under a minute without re-proving.
