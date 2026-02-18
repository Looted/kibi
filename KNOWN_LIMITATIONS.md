# Known Limitations - Kibi v0

This document describes the performance characteristics, known issues, and limitations of Kibi v0.0.1 (Functional Alpha). It is intended to help users understand current constraints and plan for future updates.

## Performance Characteristics

- **Sync operations:** 1.4–1.8 seconds average (target was <500ms; actual is 3–6x slower)
- **Query operations:** <1 second for small datasets (target was <100ms)
- **Large dataset performance:** 1000-entity query extrapolated at ~67.5s (target was <100ms), making v0 675x slower than ambitious goals
- **Root causes (suspected):**
  - RDF triple store persistence (disk I/O on every sync)
  - No caching or incremental updates
  - Full graph traversal on every query
  - Prolog interpreter overhead
  - JSON serialization overhead

## Known Issues

### Issue 4: Validation Not Enforced
- Entities with missing required fields (e.g., no title or source) are accepted
- Risk: Data quality issues, possible KB corruption

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
- Persistent Prolog process to eliminate startup overhead
- Query result caching
- Incremental sync with change detection
- Indexed entity lookups
- Target: 10x improvement in sync and query speed

**Additional priorities:**
- Enforce required field validation
- Add `--branch` parameter to CLI for feature parity
- Implement `kibi branch --list` command
- Optimize incremental sync to be faster than full sync

Kibi v0 is a functional alpha release. Limitations are documented to set clear expectations and guide early adopters. Feedback is welcome to help prioritize improvements for v0.1.