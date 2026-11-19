---
title: kb_author_impact_review keeps only unchanged earlier decisions and reports those it drops
status: open
priority: must
required_evidence: tested
semantic_text: kb_author_impact_review must keep a previously authored decision only for a file whose evidence and requirement fingerprints are unchanged, and must report each decision it drops.
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-19, approving these statements as worded and the staged scope first, after kb_prepare_impact_review returned about 16,000 fixed characters plus about 4,000 per file and repeated each requirement for every file that names it: "Yes, please."'
  recorded_at: '2026-11-19T21:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: db6f4ab6f2a12912f8b3f3ccfbc5be2a92c0d9b11578912f2abb3984b4d1585c
semantic_inventory:
  - claim_key: CLAIM-10FFD29200527740
    claim_text: kb_author_impact_review must keep a previously authored decision only for a file whose evidence
    role: normative
    status: modeled
    span:
      start: 0
      end: 95
  - claim_key: CLAIM-C8666734BB9424DA
    claim_text: requirement fingerprints are unchanged, and must report each decision it drops
    role: normative
    status: modeled
    span:
      start: 100
      end: 178
logic_claims:
  - CLAIM-10FFD29200527740
  - CLAIM-C8666734BB9424DA
rationale: Re-deciding every file after a small restage repeats the whole review, while a decision kept for a changed file or requirement would vouch for content nobody reviewed.
id: REQ-impact-review-author-carry
type: req
---
kb_author_impact_review must keep a previously authored decision only for a file whose evidence and requirement fingerprints are unchanged, and must report each decision it drops.

## Why

Re-deciding every file after a small restage repeats the whole review, while a decision kept for a changed file or requirement would vouch for content nobody reviewed.

## Context

carriedDecisions compares each earlier file entry's evidence with the captured evidence and, for a file that names requirements, the knowledge fingerprint; decisionsForScope names a dropped decision when its file is left undecided, and the result lists dropped decisions.

## Source

> Maintainer decision, 2026-11-19, approving this statement as worded.
