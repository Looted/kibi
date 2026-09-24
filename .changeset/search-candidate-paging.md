---
"kibi-cli": patch
---

kb_search no longer fails on large knowledge bases. On repositories with thousands of entities, search previously died with "Query exceeded bounded Prolog output capacity (ENOBUFS)" because it requested every candidate entity in a single query. Search candidates are now fetched in bounded pages (500 per query) before ranking, in both legacy and intent-v1 ranking modes, so search works reliably regardless of repository size.

- Add `loadSearchCandidates` paged fetcher in `discovery-entities.ts` and use it from `executeSearch` and intent-search candidate loading.
- Cover the paging contract with behavior tests (multi-page aggregation, candidate cap, empty-page termination).
