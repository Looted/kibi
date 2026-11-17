---
title: Branch store journal and snapshot files
status: active
fact_kind: subject
subject_key: kibi.core.journal_files
tags:
  - core
  - persistence
origin:
  kind: agent
  recorded_at: '2026-11-17T05:57:54.992Z'
id: FACT-SUBJ-kibi-core-journal-files
type: fact
---
The journal (.jrn) and snapshot (.trp, and .trp.new while one is written) files SWI-Prolog's rdf_persistency keeps for a branch store's RDF graph under <store>/rdf. rdf_persistency names each of them after the graph URI, percent-encoding every character except ASCII letters, digits and `_`, so the graph URI Kibi picks for a store decides how long these file names are.