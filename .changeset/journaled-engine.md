---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

Kibi now keeps a shared engine warm for each workspace and branch, so repeated
CLI and MCP operations no longer pay SWI-Prolog startup or rewrite a complete
RDF snapshot for every change. Existing branches migrate once to journaled RDF
storage, while normal sync updates only changed sources and relationships.
Writes keep their audit record transactionally, and the new storage commands
make compaction and legacy exports explicit.

- Add SWI `rdf_persistency` journal attach/save/compact/export and guarded legacy
  migration with generation metadata and old-client fencing.
- Add the Node 18+ engine daemon, framed local RPC client, lifecycle commands,
  Node-only CLI/MCP runtime boundary, and delta sync batching.
- Add journaled-engine requirements, scenarios, tests, and ADR-024.
