---
"kibi-cli": patch
---

kb_search no longer fails on large knowledge bases. On repositories with thousands of entities, search previously died with "Query exceeded bounded Prolog output capacity (ENOBUFS)" because it requested every candidate entity in a single query. Search candidates are now fetched in bounded pages (500 per query) before ranking, in both legacy and intent-v1 ranking modes, so each response stays well under the output bound in practice and the observed large-KB failure is fixed. The page size bounds response size per query; it is not a byte-level guarantee for arbitrarily large individual entity payloads.

- Add `loadSearchCandidates` paged fetcher in `discovery-entities.ts` and use it from `executeSearch` and intent-search candidate loading.
- Call the port's `searchEntities` through the port itself so the method receiver is preserved for `PrologPort` implementations that are not pre-bound (e.g. `EngineClient`, whose `searchEntities` depends on `this`).
- Cover the paging contract with behavior tests (multi-page aggregation, candidate cap, empty-page termination, receiver preservation).
