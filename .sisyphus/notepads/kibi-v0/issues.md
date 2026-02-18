## [2026-02-18] Fix kb_save RDF Persistence

- Modified: packages/core/src/kb.pl (kb_save)
- Root cause: kb_save previously only attempted rdf_save when kb_graph/1 succeeded; in some failure modes the graph fact wasn't present or query failed, causing rdf_save to be skipped and no kb.rdf file to be written.
- Fix: Always attempt to write kb.rdf. If kb_graph(GraphURI) is available, save that graph. Otherwise fall back to saving the default dataset. Added catch/print_message wrapping to surface errors.
- Result: Running `kibi sync` no longer silently skips RDF persistence; kb.rdf is now produced in `.kb/branches/main/` when sync completes. Tests were re-run; initial prolog load error "Invalid query syntax" appears unrelated to this change (likely from malformed dynamic facts elsewhere) and must be investigated separately.

## [2026-02-18] Fix relates_to assertion timeout on sync re-run

- Symptom: second `kibi sync` run timed out (30s) specifically while asserting `relates_to`.
- Root cause: `kb_attach/1` loaded `kb.rdf` into the same RDF graph repeatedly without unloading/detaching first, which duplicated `kb:type` triples. That made `kb_entity/3` non-deterministic (multiple identical solutions per entity), and `kb_assert_relationship/4` then became non-deterministic too. The Node Prolog wrapper waits for a single "true."/"false." and never answers the toplevel continuation prompt (";"), so the query appeared to hang until the 30s JS timeout.
- Fix (packages/core/src/kb.pl):
  - Make `kb_attach/1` detach first if already attached and unload the graph if it already exists.
  - Make entity upserts idempotent by retracting existing entity triples before re-asserting.
  - Make relationship asserts deterministic (`once/1` around type lookups) and idempotent (retract existing triple before assert).
  - Register `xsd` prefix (so rdf_save namespaces work) and fix `db_sync/1` call to use the actual audit log handle.
- Fix (packages/cli/src/commands/sync.ts): treat git branch `master` as `main` so sync writes/reads `.kb/branches/main` in freshly `git init`’d repos.
- Result: `bun test packages/cli/tests/commands/sync.test.ts` now passes 5/5 and no longer hits the 30s timeout.
