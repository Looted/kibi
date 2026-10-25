---
title: Kibi reports how strong the evidence behind each requirement is
status: open
required_evidence: tested
priority: should
tags:
  - proof
  - coverage
  - evidence
firmness: default
semantic_text: Kibi coverage must report for each requirement an evidence level of proved, tested, asserted or unverified that is never stronger than the evidence behind it. Kibi coverage must report a requirement whose end-to-end proof passes as proof status tested and evidence level tested. Kibi coverage must report a requirement without passing end-to-end proof that a person approved or that is firm as evidence level asserted. Kibi coverage must report a requirement without passing end-to-end proof that an agent wrote and no person approved as evidence level unverified. Kibi report and kibi signoff must show the evidence level of each requirement.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c809ae24813f46d59f7e7f86c88145fc4c3a825343bed6065b58ca2fbd4add61
semantic_inventory:
  - claim_key: CLAIM-6A120A441BC6AD42
    claim_text: Kibi coverage must report for each requirement an evidence level of proved, tested, asserted or unverified that is never stronger than the evidence behind it
    role: normative
    status: modeled
    span:
      start: 0
      end: 157
  - claim_key: CLAIM-1F5CD5FE337685E8
    claim_text: Kibi coverage must report a requirement whose end-to-end proof passes as proof status tested and evidence level tested
    role: normative
    status: modeled
    span:
      start: 159
      end: 277
  - claim_key: CLAIM-8CC5FD409135E5CB
    claim_text: Kibi coverage must report a requirement without passing end-to-end proof that a person approved or that is firm as evidence level asserted
    role: normative
    status: modeled
    span:
      start: 279
      end: 417
  - claim_key: CLAIM-82EA2C9F2F3B12A2
    claim_text: Kibi coverage must report a requirement without passing end-to-end proof that an agent wrote and no person approved as evidence level unverified
    role: normative
    status: modeled
    span:
      start: 419
      end: 563
  - claim_key: CLAIM-22E34F860C144AB0
    claim_text: Kibi report and kibi signoff must show the evidence level of each requirement
    role: normative
    status: modeled
    span:
      start: 565
      end: 642
logic_claims:
  - CLAIM-6A120A441BC6AD42
  - CLAIM-1F5CD5FE337685E8
  - CLAIM-8CC5FD409135E5CB
  - CLAIM-82EA2C9F2F3B12A2
  - CLAIM-22E34F860C144AB0
origin:
  kind: agent
  recorded_at: '2026-10-23T12:06:50.626Z'
id: REQ-kibi-evidence-levels
type: req
---
Kibi coverage must report for each requirement an evidence level of proved, tested, asserted or unverified that is never stronger than the evidence behind it. Kibi coverage must report a requirement whose end-to-end proof passes as proof status tested and evidence level tested. Kibi coverage must report a requirement without passing end-to-end proof that a person approved or that is firm as evidence level asserted. Kibi coverage must report a requirement without passing end-to-end proof that an agent wrote and no person approved as evidence level unverified. Kibi report and kibi signoff must show the evidence level of each requirement.

## Context

Kibi called a requirement proven when passing end-to-end receipts covered every linked scenario. Tests sample cases, so that word overclaimed: the project owner approved a design that makes every guarantee say exactly how strong it is, so nothing reads stronger than its evidence. The first step renames the proof status proven to tested and adds one evidence level per requirement: proved for a re-checkable certificate over every case (no proof kind issues one yet), tested for passing end-to-end proof, asserted when a person stands behind the statement but nothing current checks it, and unverified when only an agent does. Firmness stays a separate axis, since it says how sure the person is rather than how strong the evidence is. Later steps add certificates for knowledge-base theorems, a required level on each requirement in place of the hand-maintained proof baseline, and proof kinds for code.

## Source

"A loose idea, but can we ensure a formal proof for anything we do in Kibi? I just want to brainstorm it here." Approving the written design: "Looks good, go ahead."
