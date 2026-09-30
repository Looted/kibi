---
"kibi-cli": patch
"kibi-core": patch
---

`kb_search`, `kb_query`, intent search, and bootstrap planning no longer fail with `ENOBUFS` once a project's proof receipt history grows large. Several discovery paths asked the engine for every candidate entity with all its properties, test receipt histories included, in a single answer. On this repository that answer is 8–14 MiB, past the engine's 8 MiB output cap, so even a `limit: 1` search for an existing requirement failed. Results and ranking are unchanged. Search candidates now carry only the fields ranking needs, and complete entities are loaded only for the page actually returned.

- kibi-core: `kb_search_entities` returns projected candidate rows (identity, title, status, tags, source and coordinates, text fields). Receipt histories, proof contracts, and other large structured properties stay in the store. New `kb_list_search_candidates/5` (projected, paged listing) and `kb_entity_ids/1` (IDs without properties).
- kibi-cli: `kb_search` with `fields: "full"` reloads only the returned page's complete entities by ID. Ports without the engine's indexed methods run the same bounded Prolog search through `query` instead of loading every entity.
- kibi-cli: `kb_query` pages are fetched in bounded chunks (`ENTITY_QUERY_CHUNK_SIZE`, 25 rows) through the engine and through the non-engine fallback, which no longer materializes every matching entity before paginating.
- kibi-cli: intent search's semantic scan uses the projected listing (same candidate bound), bootstrap generation enumerates IDs only, and symbol repair plans page the symbol inventory.
