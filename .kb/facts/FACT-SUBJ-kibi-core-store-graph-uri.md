---
title: Branch store graph URI
status: active
fact_kind: subject
subject_key: kibi.core.store_graph_uri
tags:
  - core
  - persistence
origin:
  kind: agent
  recorded_at: '2026-11-17T06:03:32.905Z'
id: FACT-SUBJ-kibi-core-store-graph-uri
type: fact
---
The RDF graph URI kb.pl gives a journaled branch store when it is created (journal_expected_graph_uri/2): the store directory's file:// URI, or urn:kibi:store:<sha1 of the store directory>. A store that already holds triples keeps the graph it was written with.