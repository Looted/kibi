---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
---

Fix issue #53 npm consumer regressions

- Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
- Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
- Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
- Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
- Added packed tarball E2E regression tests covering installed package behavior
