---
title: A single-member merge train reuses checks only for the same git tree
status: open
tags:
  - ci
  - merge-train
origin:
  kind: agent
  ref: CI speed review, 2026-11-24, section 5 item K4
  recorded_at: '2026-11-24T15:25:20.029Z'
semantic_text: A merge train that holds exactly one pull request reuses a workflow's already passing result only when the train commit, the member commit, and the checkout under test are the same git tree and that member's latest run of the workflow attested that tree.
logic_claims:
  - CLAIM-71EADD415DB8C174
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
firmness: default
required_evidence: asserted
rationale: Eleven of the last fifteen merge trains held one pull request and re-ran CI, proof, and the release pack for about nineteen minutes on a tree that had just passed. Reusing that result is safe only when the git tree is identical; a rebase onto a newer develop changes the tree and must run the checks again. A false proof is the worst failure this rule can have.
semantic_source_hash: 89134ff3286169bf254e3485e5fbfe32a1ef96231b4a2ca225b892bfce617bd6
semantic_inventory:
  - claim_key: CLAIM-71EADD415DB8C174
    claim_text: A merge train that holds exactly one pull request reuses a workflow's already passing result only when the train commit, the member commit, and the checkout under test are the same git tree and that member's latest run of the workflow attested that tree
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 253
id: REQ-ci-merge-train-member-reuse
type: req
---
A merge train that holds exactly one pull request reuses a workflow's already passing result only when the train commit, the member commit, and the checkout under test are the same git tree and that member's latest run of the workflow attested that tree.

## Context

Eleven of the last fifteen merge trains held one pull request and re-ran CI, proof, and the release pack for about nineteen minutes on a tree that had just passed. Reusing that result is safe only when the git tree is identical. A rebase onto a newer develop, or any other change of content, changes the tree and the checks run again. A lookup failure, a missing attestation, or more than one member runs the workflow in full. A false proof is the failure this rule exists to prevent.

## Source

> CI speed review, 2026-11-24, section 5: when a train holds one PR whose head is identical in content (same tree) to what already passed, reuse those results. Never skip checks when the tree differs, for example after a rebase onto a newer develop.
