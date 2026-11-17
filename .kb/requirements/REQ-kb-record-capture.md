---
title: A rule is recorded in one kb_record call
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb-record
  - decision-capture
origin:
  kind: agent
  ref: 'Maintainer request: a stated rule is recorded with one kb_record call, translated into one kb_upsert payload, that returns the commit gate''s verdict; facts and other modeling stay on kb_upsert.'
  recorded_at: '2026-11-17T06:44:19.647Z'
rationale: Writing a first rule through kb_upsert means reading its whole schema and building a requirement payload by hand, so agents leave out the reason, the quote or the code links and learn only at commit time what the gate refuses.
semantic_text: 'kb_record (CLI: kibi record --input -) must take a statement, a why, who said it (user, maintainer or agent), an optional quote, the code that implements the rule as {file, symbol} entries and an optional test id, and record them as one requirement whose body holds the statement, whose reason is the why, whose implementedBy links are the code and, with a test, whose verified_by link and covered_by links go to that test. A rule a user or maintainer stated must be recorded as firm, with origin kind human and the quote as its origin.ref; a rule the agent chose must be recorded as default, with origin kind agent. A committed kb_record must return the commit gate''s verdict on the change (commitAllowed, and every finding with its blocks value), and the steps the requirement still needs, such as its scenario and test, as nextActions with ready inputs.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8fe10e8fcb86d8eb5ceeeb6a9d50903288ff0d26e46cb2f2604a694c113c1c65
semantic_inventory:
  - claim_key: CLAIM-515784DB35953EE2
    claim_text: 'kb_record (CLI: kibi record --input -) must take a statement, a why, who said it (user, maintainer or agent), an optional quote, the code that implements the rule as {file, symbol} entries and an optional test id, and record them as one requirement whose body holds the statement, whose reason is the why, whose implementedBy links are the code and, with a test, whose verified_by link and covered_by links go to that test'
    role: normative
    status: modeled
    span:
      start: 0
      end: 422
    subjects:
      - kibi.kb_record
  - claim_key: CLAIM-79FE3205C4E73F29
    claim_text: A rule a user or maintainer stated must be recorded as firm, with origin kind human and the quote as its origin.ref
    role: normative
    status: modeled
    span:
      start: 424
      end: 539
    subjects:
      - kibi.kb_record
  - claim_key: CLAIM-16DDB33626EBABA0
    claim_text: a rule the agent chose must be recorded as default, with origin kind agent
    role: normative
    status: modeled
    span:
      start: 541
      end: 615
    subjects:
      - kibi.kb_record
  - claim_key: CLAIM-D34806ABA88450DB
    claim_text: A committed kb_record must return the commit gate's verdict on the change (commitAllowed, and every finding with its blocks value), and the steps the requirement still needs, such as its scenario and test, as nextActions with ready inputs
    role: normative
    status: modeled
    span:
      start: 617
      end: 855
    subjects:
      - kibi.kb_record
logic_claims:
  - CLAIM-515784DB35953EE2
  - CLAIM-79FE3205C4E73F29
  - CLAIM-16DDB33626EBABA0
  - CLAIM-D34806ABA88450DB
id: REQ-kb-record-capture
type: req
---
kb_record (CLI: kibi record --input -) must take a statement, a why, who said it (user, maintainer or agent), an optional quote, the code that implements the rule as {file, symbol} entries and an optional test id, and record them as one requirement whose body holds the statement, whose reason is the why, whose implementedBy links are the code and, with a test, whose verified_by link and covered_by links go to that test. A rule a user or maintainer stated must be recorded as firm, with origin kind human and the quote as its origin.ref; a rule the agent chose must be recorded as default, with origin kind agent. A committed kb_record must return the commit gate's verdict on the change (commitAllowed, and every finding with its blocks value), and the steps the requirement still needs, such as its scenario and test, as nextActions with ready inputs.

## Context

Writing a first rule through kb_upsert means reading its whole schema and building a requirement payload by hand, so agents leave out the reason, the quote or the code links and learn only at commit time what the gate refuses.

## Source

> Maintainer request: a stated rule is recorded with one kb_record call, translated into one kb_upsert payload, that returns the commit gate's verdict; facts and other modeling stay on kb_upsert.
