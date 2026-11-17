---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
---

A branch store snapshot no longer holds the same triple twice. SWI-Prolog's rdf_db can still hold reindexed triples its garbage collector has not reclaimed, and a snapshot written at that moment saved each of them twice. Every later load of the store (a new engine, a restarted daemon, `kibi check` in another process) then saw the second copy, which showed up as superseded `kb_search` answers, `strict-fact-shape` reporting several value fields on one fact, doubled relationships and fields missing from entities, and came and went with garbage-collection timing. The engine now holds rdf_db's background collector while it writes a snapshot, and collects and optimizes the store first; when that cannot finish within about a second it keeps the journal instead of writing the snapshot and says so on stderr.

A store that an earlier release already saved with duplicates is repaired the first time an engine attaches it: the engine keeps one copy of each duplicated triple, rewrites the snapshot, prints `kibi: repaired branch store ...` on stderr and records the repair in the store's `.kibi-store-repair.json`. For seven days after a repair `kb_status` lists it as a `branch_store_repaired` notice and `kibi doctor` shows the Branch store check as a warning, so answers given before the repair can be rechecked.
