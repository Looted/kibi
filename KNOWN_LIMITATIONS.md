# Known Limitations - Kibi v0

This document describes the performance characteristics, known issues, and limitations of Kibi v0.0.1 (Functional Alpha). It is intended to help users understand current constraints and plan for future updates.

## Performance Characteristics

**v0.1 Optimizations Applied:**
- Query result caching (in-memory Map, per-process)
- Batch RDF operations using `rdf_transaction/1` for atomic batching
- Hash-based change detection for incremental sync (`.kb/sync-cache.json`)
- Forward object-link format migration for proper traceability

**Benchmark Results (v0.1 vs v0.0):**
- **Incremental sync (1/100 files changed):** 2.02x faster (30.93s → 15.29s, 50.57% improvement) ✅
- **Full sync (100 files):** 1.01x faster (14.91s → 14.76s, minimal improvement)
- **Query (all 100 entities):** 1.04x faster (15.86s → 15.27s, 3.72% improvement)
- **Query (by ID, 100 entities):** 1.04x faster (15.91s → 15.28s, 3.96% improvement)
- **MCP kb_query:** 1.06x faster (1.07s → 1.01s, 5.61% improvement)

**Current Performance:**
- **Sync operations:** 14-15 seconds for 100 entities (incremental: 15.29s, full: 14.76s)
- **Query operations:** 0.95-1.03 seconds for 100 entities
- **Cache behavior:**
  - Cache hit: ~0ms (instant return from memory)
  - Cache miss: ~145ms (Prolog query execution)
  - **Limitation:** Cache is per-process, not persistent across CLI invocations
- **Large dataset performance:** Extrapolated ~67.5s for 1000-entity queries

**Root causes (suspected):**
- RDF triple store persistence (disk I/O on every sync)
- Cache is per-process (fresh on each CLI invocation)
- Full graph traversal on every query
- Prolog interpreter overhead
- JSON serialization overhead
- Entity query returns file URIs instead of simple IDs (Prolog layer issue)

## Known Issues

### Issue 4: Validation Not Enforced
- Entities with missing required fields (e.g., no title or source) are accepted
- Risk: Data quality issues, possible KB corruption

### Issue 7: Incremental Sync Performance Fixed in v0.1
- **Status:** ✅ RESOLVED - Incremental sync is now 2.02x faster than full sync
- **Fix:** Hash-based change detection (`.kb/sync-cache.json`) properly skips unchanged files

### Issue 8: Entity Query Returns File URIs
- Entities queried via `kibi query symbol` return file URIs as IDs (e.g., `"file:///home/looted/projects/kibi/.kb/branches/SYM-001"`)
- Expected: Simple IDs like `"SYM-001"`
- **Impact:** Only affects JSON output format; table output truncates to 16 characters anyway
- **Root cause:** Prolog layer (kb_entity predicate) returns file URIs instead of simple IDs
- **Workaround:** The `parsePrologValue` function (query.ts:352-358) is designed to handle this case but needs investigation

### Issue 9: Cache Not Persistent Across CLI Invocations
- Cache is per-process (new PrologProcess instance = fresh cache)
- Each `kibi query` command creates a new process, so cache doesn't persist
- **Impact:** Cache benefits are only available for repeated queries within same process (e.g., during sync)
- **Constraint:** Persistent caching would require architectural changes (singleton process or disk cache) - outside v0.1 scope

### Issue 5: CLI Lacks --branch Parameter
- CLI commands do not accept a `--branch` parameter (MCP tools do)
- Impact: Cannot test or query per-branch KBs via CLI; feature gap

### Issue 6: Branch List Command Not Implemented
- `kibi branch --list` command is documented but not functional
- Impact: Users cannot list branch KBs as described; documentation mismatch

### Issue 7: Incremental Sync Performance Regression
- Incremental sync (1 file changed) is 2x slower than full sync
- Impact: Defeats purpose of incremental sync; performance regression

## Target Users

### Who Should Use Kibi v0
- Early adopters willing to provide feedback
- Small projects with fewer than 100 entities
- Proof-of-concept implementations
- Local development workflows
- Teams exploring knowledge base architecture

### Who Should NOT Use Kibi v0
- Large-scale production deployments
- Projects with more than 1000 entities
- Performance-critical applications
- Mission-critical systems requiring SLAs

## Workarounds

- For performance: Limit KB size to under 100 entities for acceptable sync/query times
- For validation: Manually check entity files for required fields before syncing
- For branch-specific queries: Use MCP tools (not CLI) to specify branch
- For branch listing: Manually inspect `.kb/branches/` directory as a temporary workaround
- For incremental sync: Prefer full syncs until delta detection is improved in v0.1

## v0.1 Roadmap

**Primary focus: Performance optimization**
- ✅ Query result caching (in-memory Map, per-process)
- ✅ Batch RDF operations using `rdf_transaction/1`
- ✅ Hash-based change detection for incremental sync
- ✅ Forward object-link format migration (relationships with proper types)
- ⚠️ Persistent Prolog process - requires architectural changes
- ⚠️ Indexed entity lookups - requires Prolog schema changes
- Target achieved: 2.02x speedup for incremental sync

**Dogfooding Findings (MCP vs CLI):**
- **MCP is 15x faster than CLI for queries** (1.07s vs 15.86s average)
- **Relationship queries are the killer feature** - `kibi_kb_query_relationships` provides instant traceability
- **MCP advantages:**
  - No CLI process startup overhead
  - Direct PrologProcess reuse (single session)
  - Proper initialization sequence (initialize → initialized → tool call)
- **CLI advantages:**
  - Simpler setup (no initialization required)
  - Better for ad-hoc queries in terminal
- **Recommendation:** Use MCP for automated workflows/agent tasks; use CLI for manual/interactive queries

**Additional priorities:**
- Enforce required field validation
- Add `--branch` parameter to CLI for feature parity
- Implement `kibi branch --list` command
- Optimize incremental sync to be faster than full sync

Kibi v0 is a functional alpha release. Limitations are documented to set clear expectations and guide early adopters. Feedback is welcome to help prioritize improvements for v0.1.
