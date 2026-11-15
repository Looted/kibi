---
title: Text exchanged with the SWI-Prolog process
status: active
fact_kind: subject
subject_key: kibi.prolog.text_transport
canonical_key: kibi.prolog.text_transport
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
text_ref: REQ-prolog-utf8-text
origin:
  kind: agent
  recorded_at: '2026-10-14T20:16:25.913Z'
id: FACT-prolog-utf8-text-subject
type: fact
---

The text Kibi sends to and reads back from its SWI-Prolog process, which must keep every character whatever the host locale, including a multi-byte character split across output chunks. It is the transport encoding, not the meaning of the text.
