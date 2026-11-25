---
title: Outside contributors sign the Kibi CLA before their pull request can merge
status: open
priority: must
tags:
  - governance
  - licensing
  - contributing
  - ci
text_ref: .github/workflows/cla.yml
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer request, 2026-11-25: "draft a good CLA for me so I can at some point sell Kibi or basically earn money on it, even if people commit to it, and also configure it on GitHub for me"; "I''m gonna open up for contributions and have the CLA flow."'
  recorded_at: '2026-11-25T06:05:49.770Z'
rationale: The maintainer wants to be able to sell or commercialize Kibi even after outside contributions, which needs every contributor's copyright assigned under the Kibi CLA.
semantic_text: The CLA workflow must run the CLA check when a pull request is opened, updated or closed, and when a pull request comment is the CLA sign sentence or recheck, without checking out pull request code. The CLA check must exempt only the maintainer account and bot accounts. The CLA sign sentence must be the same in the CLA workflow, CONTRIBUTING.md and CLA.md. The CLA workflow must store signatures on the cla-signatures branch, not on develop or master.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 92e805f9fa0e405ac4d68e5f119d25a9ee3c36564ccf7881490fd3eceed26184
semantic_inventory:
  - claim_key: CLAIM-76365DF756687271
    claim_text: The CLA workflow must run the CLA check when a pull request is opened, updated or closed, and when a pull request comment is the CLA sign sentence or recheck, without checking out pull request code
    role: normative
    status: modeled
    span:
      start: 0
      end: 197
    subjects:
      - kibi.repository.cla_check
    reason: Grounded by FACT-cla-check-runs-on-pull-requests via requires_property.
  - claim_key: CLAIM-8402CC174E5F20C0
    claim_text: The CLA check must exempt only the maintainer account and bot accounts
    role: exception
    status: modeled
    span:
      start: 199
      end: 269
    subjects:
      - kibi.repository.cla_check
    reason: Grounded by FACT-cla-check-exempts-maintainer-and-bots via requires_property.
  - claim_key: CLAIM-8FE3B3221D4469A4
    claim_text: The CLA sign sentence must be the same in the CLA workflow, CONTRIBUTING.md and CLA.md
    role: normative
    status: modeled
    span:
      start: 271
      end: 357
    subjects:
      - kibi.repository.cla_check
    reason: Grounded by FACT-cla-sign-sentence-consistent via requires_property.
  - claim_key: CLAIM-EFD05B445AAC3006
    claim_text: The CLA workflow must store signatures on the cla-signatures branch, not on develop or master
    role: normative
    status: modeled
    span:
      start: 359
      end: 452
    subjects:
      - kibi.repository.cla_check
    reason: Grounded by FACT-cla-signatures-branch via requires_property.
logic_claims:
  - CLAIM-76365DF756687271
  - CLAIM-8402CC174E5F20C0
  - CLAIM-8FE3B3221D4469A4
  - CLAIM-EFD05B445AAC3006
id: REQ-contributions-require-cla
type: req
required_evidence: tested
---
The CLA workflow must run the CLA check when a pull request is opened, updated or closed, and when a pull request comment is the CLA sign sentence or recheck, without checking out pull request code. The CLA check must exempt only the maintainer account and bot accounts. The CLA sign sentence must be the same in the CLA workflow, CONTRIBUTING.md and CLA.md. The CLA workflow must store signatures on the cla-signatures branch, not on develop or master.

## Context

Kibi is distributed under AGPL-3.0-or-later with a single copyright holder, and contributions were closed. The maintainer opened them on 2026-11-25 under the Kibi Contributor License Agreement (CLA.md), so that Kibi can still be relicensed or sold as a whole after outside contributions (ADR-contributions-require-cla). The CLA check is what makes a contributor sign before their first pull request merges; the maintainer account and bots are exempt because the maintainer owns the code and bot commits carry no authorship.

## Source

Maintainer, 2026-11-25: "draft a good CLA for me so I can at some point sell Kibi or basically earn money on it, even if people commit to it, and also configure it on GitHub for me", and "we should probably update contributing with the new rules. So I'm gonna open up for contributions and have the CLA flow."