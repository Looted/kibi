---
title: Branch store journal file names fit the file name limit
status: active
priority: must
firmness: firm
required_evidence: tested
tags:
  - core
  - persistence
  - rdf
semantic_text: Kibi MUST keep every file name that SWI-Prolog's rdf_persistency derives from a branch store's graph URI within 255 bytes, whatever the workspace path. A store keeps its file:// graph URI only while the percent-encoded name plus the longest suffix (`.trp.new`) fits; otherwise it uses `urn:kibi:store:<sha1 of the store directory>`.
logic_claims:
  - CLAIM-BB86EAD5EE38CE12
  - CLAIM-91D495162C148E56
  - CLAIM-AB3CE0209A0F4C4A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fa289f861f1508b6e5a0d480d6e5fc7881e209edd3a5058d48d2a852404d346c
semantic_inventory:
  - claim_key: CLAIM-BB86EAD5EE38CE12
    claim_text: Kibi MUST keep every file name that SWI-Prolog's rdf_persistency derives from a branch store's graph URI within 255 bytes, whatever the workspace path
    role: normative
    status: modeled
    span:
      start: 0
      end: 150
  - claim_key: CLAIM-91D495162C148E56
    claim_text: A store keeps its file:// graph URI only while the percent-encoded name plus the longest suffix (`.trp.new`) fits
    role: descriptive
    status: modeled
    span:
      start: 152
      end: 265
  - claim_key: CLAIM-AB3CE0209A0F4C4A
    claim_text: otherwise it uses `urn:kibi:store:<sha1 of the store directory>`
    role: descriptive
    status: modeled
    span:
      start: 267
      end: 331
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-17, "Approvals: approve all"): "Kibi MUST keep every file name that SWI-Prolog''s rdf_persistency derives from a branch store''s graph URI within 255 bytes, whatever the workspace path. A store keeps its file:// graph URI only while the percent-encoded name plus the longest suffix (`.trp.new`) fits; otherwise it uses `urn:kibi:store:<sha1 of the store directory>`."'
  recorded_at: '2026-11-17T06:04:18.481Z'
id: REQ-core-journal-file-name-fits
type: req
---
Kibi MUST keep every file name that SWI-Prolog's rdf_persistency derives from a branch store's graph URI within 255 bytes, whatever the workspace path. A store keeps its file:// graph URI only while the percent-encoded name plus the longest suffix (`.trp.new`) fits; otherwise it uses `urn:kibi:store:<sha1 of the store directory>`.

## Context

The first `kibi sync` of a knowledge base in a workspace whose path was about 115 characters long and full of `/`, `-` and `.` killed the engine: SWI-Prolog 10.0.2 aborted with "API error: invalid term_t ... (out of range)" inside `rdf_transaction/3`, and the CLI reported "Query interrupted because the Prolog process terminated". rdf_persistency names a graph's journal after the percent-encoded graph URI, where each `/`, `-` or `.` takes three bytes. Kibi used the digest graph URI only when the `file://` URI was longer than 200 characters, so a shorter URI with many separators still encoded to a journal name over the 255-byte file name limit; opening the journal then threw inside SWI's RDF monitor callback, and SWI aborts the whole process on an exception there. A store that already exists keeps the graph it was written with.

## Source

Maintainer-approved statement (2026-11-17, "Approvals: approve all"): "Kibi MUST keep every file name that SWI-Prolog's rdf_persistency derives from a branch store's graph URI within 255 bytes, whatever the workspace path. A store keeps its file:// graph URI only while the percent-encoded name plus the longest suffix (`.trp.new`) fits; otherwise it uses `urn:kibi:store:<sha1 of the store directory>`."