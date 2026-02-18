## [2026-02-18] Fix kb_save RDF Persistence

- Modified: packages/core/src/kb.pl (kb_save)
- Root cause: kb_save previously only attempted rdf_save when kb_graph/1 succeeded; in some failure modes the graph fact wasn't present or query failed, causing rdf_save to be skipped and no kb.rdf file to be written.
- Fix: Always attempt to write kb.rdf. If kb_graph(GraphURI) is available, save that graph. Otherwise fall back to saving the default dataset. Added catch/print_message wrapping to surface errors.
- Result: Running `kibi sync` no longer silently skips RDF persistence; kb.rdf is now produced in `.kb/branches/main/` when sync completes. Tests were re-run; initial prolog load error "Invalid query syntax" appears unrelated to this change (likely from malformed dynamic facts elsewhere) and must be investigated separately.
